import test from 'ava'
import Router from '../src'

// default route
function droute (route) {
  return {
    splat: '',
    routeParams: {},
    queryParams: {},
    ...route
  }
}

function routeMatchUrl (t, router, route, url) {
  // This checks the (route->url (url->route x)) == x identity
  t.is(router.getRouteUrl(route), url)
  t.deepEqual(router.getUrlRoute(url), droute(route))
}

test('Router should default to an empty basePath', t => {
  const router = new Router('index')
  routeMatchUrl(t, router, {route: 'index'}, '/')
})

test('Router should namespace within a given basePath', t => {
  const router = new Router('my/nested/path', 'index')
  routeMatchUrl(t, router, {route: 'index'}, '/my/nested/path')
})

test('Router should accept route options', t => {
  const router = new Router('index', {serializeQuery: () => ({foo: 'bar'})})
  t.is(router.getRouteUrl({route: 'index'}), '/?foo=bar')
  t.deepEqual(router.getUrlRoute('/?foo=bar'), droute({
    route: 'index',
    queryParams: {foo: 'bar'}
  }))
})

test('Router should accept child routes', t => {
  const router = new Router('index', r => [
    r('foo', 'foo-index')
  ])
  routeMatchUrl(t, router, {route: 'foo-index'}, '/foo')
})

test('Router should accept grandchild routes', t => {
  const router = new Router('index', r => [
    r('foo', 'foo-index', r => [
      r('bar', 'bar-index', r => [
        r('baz', 'baz-index')
      ])
    ])
  ])
  routeMatchUrl(t, router, {route: 'index'}, '/')
  routeMatchUrl(t, router, {route: 'foo-index'}, '/foo')
  routeMatchUrl(t, router, {route: 'bar-index'}, '/foo/bar')
  routeMatchUrl(t, router, {route: 'baz-index'}, '/foo/bar/baz')
})

test('Router should accept child params', t => {
  const router = new Router('index', r => [
    r.param('page', 'page-index')
  ])
  routeMatchUrl(t, router, {
    route: 'page-index',
    routeParams: {page: 'about'}
  }, '/about')
})

test('Router should accept grandchild params', t => {
  const router = new Router('index', r => [
    r.param('foo', 'foo-index', r => [
      r.param('bar', 'bar-index', r => [
        r.param('baz', 'baz-index')
      ])
    ])
  ])
  routeMatchUrl(t, router, {
    route: 'foo-index',
    routeParams: {foo: 'about'}
  }, '/about')
  routeMatchUrl(t, router, {
    route: 'baz-index',
    routeParams: {
      foo: 'one',
      bar: 'two',
      baz: 'three'
    }
  }, '/one/two/three')
})

test('Router should accept child splats', t => {
  const router = new Router('index', r => [
    r.splat('file-path')
  ])
  routeMatchUrl(t, router, {
    route: 'file-path',
    splat: 'foo/bar/baz'
  }, '/foo/bar/baz')
})

test('Router should accept nested splats', t => {
  const router = new Router('index', r => [
    r('foo', 'foo-index', r => [
      r.splat('bar-path')
    ])
  ])
  routeMatchUrl(t, router, {route: 'foo-index'}, '/foo')
  routeMatchUrl(t, router, {
    route: 'bar-path',
    splat: 'foo/bar/baz.js'
  }, '/foo/foo/bar/baz.js')
})

test('Router should send redirects to their routes', t => {
  const router = new Router('index', r => [
    r('about', 'about-index'),
    r.redirect('about-me', {route: 'about-index'})
  ])
  t.deepEqual(router.getUrlRoute('/about-me'), droute({
    route: 'about-index',
    redirect: true
  }))
})

test('Router redirects should be depth-independent', t => {
  const router = new Router('index', r => [
    r('foo', 'foo-index', r => [
      r('bar', 'bar-index')
    ]),
    r('baz', 'baz-index', r => [
      r.redirect('bum', {route: 'bar-index'})
    ])
  ])
  t.deepEqual(router.getUrlRoute('/baz/bum'), droute({
    route: 'bar-index',
    redirect: true
  }))
})

test('router.isRouteEqual() should return whether two routes display the same', t => {
  const router = new Router('index', r => [
    r('foo', 'foo', {queryDefaults: {a: 'b'}})
  ])

  const cases = [
    [{route: 'index'}, {route: 'index'}],
    [{route: 'foo', queryParams: {a: 'b'}}, {route: 'foo', queryParams: {}}]
  ]

  cases.forEach(([x, y]) => {
    t.true(router.isRouteEqual(x, y))
  })
})

test('router.isRouteWithin() should return whether the first route is within the second', t => {
  const router = new Router('index', r => [
    r('foo', 'foo-index', r => [
      r('bar', 'bar-index')
    ])
  ])

  t.true(router.isRouteWithin({route: 'foo-index'}, {route: 'index'}))
  t.true(router.isRouteWithin({route: 'bar-index'}, {route: 'index'}))
  t.true(router.isRouteWithin({route: 'bar-index'}, {route: 'foo-index'}))

  t.true(router.isRouteWithin({
    route: 'foo-index',
    queryParams: {a: 'b', c: 'd'}
  }, {
    route: 'foo-index',
    queryParams: {a: 'b'}
  }))

  t.false(router.isRouteWithin({
    route: 'foo-index',
    queryParams: {a: 'b', c: 'd'}
  }, {
    route: 'foo-index',
    queryParams: {a: 'b', c: 'd'}
  }))

  t.false(router.isRouteWithin({
    route: 'bar-index'
  }, {
    route: 'foo-index',
    queryParams: {a: 'b'}
  }))
})
