import assert from 'assert'
import {
  getPath,
  getQuery,
  diffFrom,
  encodeQueryParams,
  decodeQueryParams
} from './util'

export function recur (func) {
  return function _recur (x, y, options, callback) {
    if (options === void 0) {
      return _recur(x, y, {})
    }
    if (typeof options === 'function') {
      return _recur(x, y, {}, options)
    }
    return func(x, y, options, callback)
  }
}

export const route = recur((path, route, options, routeBuilderFn) => {
  const children = buildChildren(routeBuilderFn)
  assert(!path.startsWith('/'), `Path segment "${path}" should not start with "/"`)
  assert(!path.endsWith('/'), `Path segment "${path}" should not end with "/"`)
  return {type: 'route', path, route, options, children}
})

export const routeParam = recur((param, route, options, routeBuilderFn) => {
  const children = buildChildren(routeBuilderFn)
  return {type: 'param', param, route, options, children}
})

export function buildChildren (routeBuilderFn) {
  let children = []
  if (routeBuilderFn) {
    assert(typeof routeBuilderFn === 'function', 'routeBuilderFn must be a function')
    children = routeBuilderFn(route)
    assert(Array.isArray(children), 'routeBuilderFn must return an array')
  }
  return children.map(child => (
    // nested router support
    (child._routingTable instanceof RoutingTable) ? child._routingTable.route : child
  ))
}

export function routeSplat (route, options) {
  options = options || {}
  return {type: 'splat', route, options}
}

export function routeRedirect (path, route) {
  return {type: 'redirect', path, route}
}

route.param = routeParam
route.splat = routeSplat
route.redirect = routeRedirect

export function buildTableIndex (table, index = {}, path = []) {
  for (let i = 0; i < table.length; i++) {
    const route = table[i]
    if (route.type === 'redirect') {
      continue
    }

    assert(route.hasOwnProperty('route'), 'Route name not provided')
    assert(typeof route.route === 'string', `Route name must be a string, not ${route.route}`)

    const routePath = path.concat(route)

    const existingRoute = index[route.route]
    assert(!existingRoute, `Route "${route.route}" already registered as ${JSON.stringify(existingRoute)}`)
    index[route.route] = routePath

    if (Array.isArray(route.children)) {
      buildTableIndex(route.children, index, routePath)
    }
  }
  return index
}

export function findPathRoute (route, path) {
  if (path.charAt(0) === '/') {
    path = path.slice(1)
  }
  let segment, childPath, routeParams
  switch (route.type) {
    case 'splat': return {route, path: ''}
    case 'redirect': return route.path === path && {route, path}
    case 'param':
      const nextSep = path.indexOf('/')
      segment = nextSep !== -1 ? path.slice(0, nextSep) : path
      routeParams = {[route.param]: segment}
      childPath = path.slice(segment.length)
      break
    case 'route':
      if (!path.startsWith(route.path)) {
        return
      }
      segment = path.slice(0, route.path.length)
      childPath = path.slice(segment.length)
      break
    default:
      assert(false, `Invalid route type: ${route.type}`)
  }

  const isTerminal = x => !x || x === '/'
  if (isTerminal(childPath)) {
    return {route, path, routeParams}
  }

  const {children} = route
  if (!Array.isArray(children)) {
    return
  }

  let innerResult
  for (let j = 0; j < children.length; j++) {
    const childRoute = children[j]
    innerResult = findPathRoute(childRoute, childPath)
    if (innerResult) {
      break
    }
  }
  if (!innerResult) {
    return
  }

  const result = {
    path: '/' + segment + innerResult.path,
    route: innerResult.route,
    routeParams: {...routeParams, ...innerResult.routeParams}
  }
  return result
}

export function buildUrlRoute (table, index, url) {
  const path = getPath(url)
  const result = findPathRoute(table, path)
  if (!result) {
    return null
  }

  let {route} = result
  const {deserialize, queryDefaults} = route.options || {}
  const query = decodeQueryParams(getQuery(url))
  const queryData = deserialize ? deserialize(query) : query
  const queryParams = Object.assign({}, queryDefaults, queryData)

  let splat = ''
  const {path: searchPath, routeParams = {}} = result
  if (route.type === 'redirect') {
    let {route: newRoute} = route
    if (typeof newRoute === 'function') {
      newRoute = newRoute({routeParams, queryParams})
    }
    const newRouteName = newRoute.route
    assert(newRouteName, `Redirect for ${url} does not have a route name`)
    const nextRoute = index[newRouteName]
    assert(nextRoute, `Following redirect for ${url}, route "${newRouteName}" was not found`)
    const {queryDefaults} = nextRoute.options || {}
    return {
      splat,
      routeParams: {},
      ...newRoute,
      queryParams: {...queryDefaults, ...newRoute.queryParams},
      redirect: true
    }
  }

  if (route.type === 'splat') {
    splat = path.slice(searchPath.length)
  }

  return {
    route: route.route,
    splat,
    routeParams,
    queryParams
  }
}

export function pathJoin (a, b) {
  const sep = '/'
  if (a.charAt(a.length - 1) === sep) {
    a = a.slice(0, -1)
  }
  if (b.charAt(0) === sep) {
    b = b.slice(1)
  }
  return `${a}${sep}${b}`
}

export function buildRouteUrl (routePath, {route: routeName, splat, routeParams, queryParams}) {
  let path = ''
  let route
  for (let i = 0; i < routePath.length; i++) {
    route = routePath[i]
    if (route.type === 'splat') {
      path = pathJoin(path, splat || '')
      break
    }
    if (route.type === 'param') {
      const paramName = route.param
      assert(routeParams.hasOwnProperty(paramName), `Route name "${routeName}" must be called with route paramter "${paramName}"`)
      path = pathJoin(path, routeParams[paramName])
      continue
    }

    path = pathJoin(path, route.path)
    if (route.type === 'redirect') {
      break
    }
  }

  const {serialize, queryDefaults} = route.options || {}
  const fixedQuery = serialize ? serialize(queryParams || {}) : queryParams
  const shortQuery = diffFrom(fixedQuery, queryDefaults)
  const query = encodeQueryParams(shortQuery)
  return path + query
}

export default class RoutingTable {
  constructor (basePath, indexRouteName, options, routeBuilderFn) {
    this.route = route(basePath, indexRouteName, options, routeBuilderFn)
    this.index = buildTableIndex([this.route])
  }

  getRouteForUrl (url) {
    return buildUrlRoute(this.route, this.index, url)
  }

  getUrlForRoute (routeData) {
    const routePath = this.index[routeData.route]
    if (!routePath) {
      return null
    }
    return buildRouteUrl(routePath, routeData)
  }
}
