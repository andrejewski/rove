import assert from 'assert'
import History from './history'
import RoutingTable from './routing-table'
import {
  getPath,
  getQuery,
  decodeQueryParams,
  isProperSubset
} from './util'

export default class Router {
  constructor (basePath, indexRouteName, options, routeBuilderFn) {
    if (!(typeof basePath === 'string' && typeof indexRouteName === 'string')) {
      routeBuilderFn = options
      options = indexRouteName
      indexRouteName = basePath
      basePath = ''
    }
    assert(typeof basePath === 'string', 'basePath must be a string')
    assert(typeof indexRouteName === 'string', 'indexRouteName must be a string')
    this._basePath = '/' + basePath
    this._routingTable = new RoutingTable(basePath, indexRouteName, options, routeBuilderFn)

    this._isClientSide = typeof window === 'object'
    if (this._isClientSide) {
      this._navigationListeners = []
      this._interceptLinkClicks = false
      this.onClick = this._onClick.bind(this)
      // globals -> locals for testing
      this._document = window.document
      this._location = window.location
    }
  }

  /* Universal methods */

  getRouteUrl (route) {
    return this._externalizeUrl(this._routingTable.getUrlForRoute(route))
  }

  getUrlRoute (url) {
    return this._routingTable.getRouteForUrl(this._internalizeUrl(url))
  }

  isRouteEqual (routeX, routeY) {
    const urlX = this.getRouteUrl(routeX)
    const urlY = this.getRouteUrl(routeY)
    return !!(urlX && urlY && urlX === urlY)
  }

  isRouteWithin (routeX, routeY) {
    const urlX = this.getRouteUrl(routeX)
    const urlY = this.getRouteUrl(routeY)
    if (!(urlX && urlY && urlX !== urlY)) {
      return false
    }

    const pathX = getPath(urlX)
    const pathY = getPath(urlY)
    const queryY = getQuery(urlY)
    if (!queryY) {
      return pathX.indexOf(pathY) === 0
    }

    const queryParamsX = decodeQueryParams(getQuery(urlX))
    return isProperSubset(decodeQueryParams(queryY), queryParamsX)
  }

  /* Client-side methods */

  _clientMethod (methodName) {
    const isClientSide = this._isClientSide
    assert(isClientSide, `router.${methodName} cannot be called server-side`)
  }

  _history () {
    if (this._historyInstance) {
      return this._historyInstance
    }

    this._historyInstance = new History(path => {
      const route = this.getUrlRoute(path)
      this.warnOnNavigation(false)
      this._emitNavigation(route)
    })

    this._historyInstance.attach()
  }

  _externalizeUrl (url) {
    if (!this._isClientSide) {
      return url
    }
    this._history().externalizeUrl(this._basePath, url)
  }

  _internalizeUrl (url) {
    if (!this._isClientSide) {
      return url
    }
    this._history().internalizeUrl(this._basePath, url)
  }

  _navigateTo (path, title, replace) {
    title = title || this._document.title
    replace = replace || false
    this._history().update(path, title, replace)
  }

  _emitNavigation (route) {
    this._navigationListeners.forEach(f => f(route))
  }

  onNavigation (listener) {
    this._clientMethod('onNavigation')
    assert(typeof listener === 'function', 'listener must be a function')
    this._navigationListeners.push(listener)
  }

  offNavigation (listener) {
    this._clientMethod('offNavigation')
    assert(typeof listener === 'function', 'listener must be a function')
    this._navigationListeners = this._navigationListeners
      .filter(x => x !== listener)
  }

  navigateTo (route) {
    this._clientMethod('navigateTo')
    assert(typeof route.route === 'string', 'route must be a string')
    const path = this.getRouteUrl(route)
    assert(path, `route not found for ${JSON.stringify(route)}`)
    this._navigateTo(path, null, route.replace)
  }

  warnOnNavigation (message) {
    this._navigationWarning = message
    if (!this._navigationWarning || this._beforeUnload) {
      return
    }
    const self = this
    this._beforeUnload = function _beforeUnload (e) {
      if (self._navigationWarning) {
        const message = self._navigationWarning === true ? '' : self._navigationWarning
        e.returnValue = message
        return message
      }
    }
    this._document.addEventListener('beforeunload', this._beforeUnload)
  }

  initialize () {
    this._clientMethod('initialize')
    const route = this.getCurrentRoute()
    if (route) {
      const path = this.getRouteUrl(route)
      this._navigateTo(path, null, true)
    } else {
      this._emitNavigation(route)
    }
  }

  destroy () {
    this._clientMethod('destroy')
    this.warnOnNavigation(false)
    this._document.removeEventListener('beforeunload', this._beforeUnload)
    this.interceptLinkClicks(false)
    this._history().detach()
  }

  _onClick (event) {
    this._clientMethod('onClick')
    let {target} = event
    while (target && target.tagName.toUpperCase() !== 'A') {
      target = target.parentNode
    }
    if (!(target && target.href && target.target !== '_blank')) {
      return
    }

    const {origin} = this._location
    const path = target.href.slice(origin.length)
    if (path.indexOf(this._basePath) !== 0) {
      return
    }

    event.preventDefault()
    this._navigateTo(path, target.title)
  }

  interceptLinkClicks (attach) {
    this._clientMethod('interceptLinkClicks')
    if (this._interceptLinkClicks) {
      if (!attach) {
        this._document.removeEventListener('click', this.onClick)
        this._interceptLinkClicks = false
      }
      return
    }
    this._document.addEventListener('click', this.onClick)
    this._interceptLinkClicks = true
  }

  getCurrentRoute () {
    this._clientMethod('getCurrentRoute')
    const {href, origin} = this._location
    const path = href.slice(origin.length)
    return this.getUrlRoute(path)
  }

  isRouteActive (route) {
    this._clientMethod('isRouteActive')
    return this.isRouteEqual(this.getCurrentRoute(), route)
  }

  isCurrentRouteWithin (route) {
    this._clientMethod('isCurrentRouteWithin')
    return this.isRouteWithin(this.getCurrentRoute(), route)
  }
}
