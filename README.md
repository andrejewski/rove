# Rove

> rove /rōv/: *verb* travel constantly without a fixed destination; wander.

```sh
npm install rove
```

#### Example

```js
import Router from 'rove'

const router = new Router('index', r => [
  r('users', 'users-index', r => [
    r.param('userId', 'user-index', r => [
      r('edit', 'user-edit')
    ])
  ]),
  r('files', 'files-index', r => [
    r.splat('file-index')
  ]),
  r('a/b/c', 'deep-page')
])

function clientSideUsageExample () {
  router.onNavigation(route => {
    // update app state with the route
  })

  router.initialize()
  // ^ fires `onNavigation` with the current location's route

  router.interceptLinkClicks()
  // ^ binds to the document, waiting for links within the domain

  router.navigateTo({
    route: 'user-edit',
    routeParams: {userId: 'karl'},
    queryParams: {editing: 'yes'}
  })
  // updates URL to `/users/karl/edit?editing=yes` and
  // fires `onNavigation` with {route, routeParams, queryParams}
}

function serverSideUsageExample () {
  let UserEditController, NotImplementedYetController, NotFoundController

  const url = '/users/randy/edit'
  const route = router.getUrlRoute(url)
  if (route) {
    // no matching route must be a 404, fall through
    switch (route.route) {
      case 'user-edit':
        return UserEditController(route.routeParams.userId, route.queryParams)
      default:
        return NotImplementedYetController()
    }
  }

  return NotFoundController()
}

if (window) {
  clientSideUsageExample()
} else {
  serverSideUsageExample()
}
```

## About

Rove is a routing library for client and server applications.
It does not dictate application structure around it. Rove is a small component of the application which has a small API and speaks in JavaScript objects. Rove also does not expose URLs or their construction, using route names to
convey a given route, which is better and more resilient for real applications.

More specifically, Rove has the following features:

- Push-state with hash history fallback
- Route parameters, like `:id`
- Query parameters, like `?yes=no`
- Splat segments, like `master/src/index.js`
- Redirects
- Some nice DOM listeners for navigating on `<a>` link clicks
- Good debugging and errors for bad routing
- Nested routes and routers
- De/serialization for route and query parameters
- Defaults for route and query parameters
- Server side functions

### Design benefits
1. **Names not paths.**
No one is working in URLs, every path has a name to use instead.
This means a change from `/users` to `/people` won't break anything.
A change from `/users` to `/v1/users` also does not break anything.

2. **No string manipulation.**
Route and query parameters inject behind the curtain.
No need to manually build URLs.

3. **Less state.**
Having names instead of paths, we can do `switch(route)`'ing in our views. The current route also belongs in application state, not tied to the router.

4. **Better writing/debugging.**
Based on the routing, the developer receives errors for:
  - Registering a route name more than once (conflict)
  - Navigating to a route name that is not registered
  - Not providing all necessary route parameters for a given route
  - And more!

  Since the routing table builds from nested arrays, the way we check
  for a matching route and priorities are much more intuitive.

5. **Routing is more compose-able.**
Routes can assemble agnostic to where they mount.
These can be anywhere in the app URL wise but we can always use them by name.

### What's missing intentionally?
- Regular Expression support. I do not think it necessary for now.

- Document title management. This is another piece of state that can take into consideration the entire application state and different loading/errors states, which Rove stays away from knowing about.

- UI components. Someone else can build a sweet `<Link>` component.

- Function handlers for dispatching. Again, this is about state management. Rove does not care about application views or controllers and structuring an app around the router causes a lot of problems.

## Documentation

- [`router = new Router([basePath: string = "/"], indexRouteName: string, routeBuilderFn)`]()
  - Universal methods
    - [`getRouteUrl(route: NavigationEntry): string`]()
    - [`getUrlRoute(url: string): NavigationEntry`]()
    - [`isRouteEqual(routeX: NavigationEntry, routeY: NavigationEntry): boolean`]()
    - [`isRouteWithin(routeX: NavigationEntry, routeY: NavigationEntry): boolean`]()
  - Client-side methods (i.e. history state aware)
    - [`onNavigation(listener: function)`]()
    - [`navigateTo(route: NavigationOptions)`]()
    - [`warnOnNavigation(message: string)`]()
    - [`initialize()`]()
    - [`interceptLinkClicks()`]()
    - [`onClick(event: MouseEvent)`]()
    - [`getCurrentRoute(): NavigationEntry`]()
    - [`isRouteActive(route: NavigationEntry): boolean`]()
    - [`isCurrentRouteWithin(route: NavigationEntry): boolean`]()

#### `router = new Router([basePath: string = "/"], indexRouteName: string, routeBuilderFn)`
This method builds the routing table of the router. The `basePath` determines where to start caring about route matching. The `indexRouteName` is the top-level route (i.e. `basePath`). The `routeBuilderFn` must be a function which accepts the `r(path: string, routeName: string, [options: RouteOptions], routeBuilderFn)` function and returns an array containing the results of calls to `r()` or child `Router` instances.

Route building is the most complex part of Rove. It helps to consider `route()` to be the same as calling `r` like `r('/', 'index', r => [])`.

`RouteOptions` is a map of the following options:

| Option | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `serialize` | function | *identity* | Change `splat`, `routeParams`, and `queryParams` before they encode into the URL.
| `deserialize` | function | *identity* | Change `splat`, `routeParams`, and `queryParams` after they decode from the URL.
| `routeDefaults` | object | `{}` | Defaults which merge into `routeParams` for the route
| `queryDefaults` | object | `{}` | Defaults which merge into `queryParams` for the route. **Note:** Default values in the final `queryParam` object are not reflected in the URL. This reduces URL clutter for routes with lots of options.

##### Params
The `r` function has a function property `r.param(paramName: string, routeName: string, [options: RouteOptions], routeBuilderFn)`. The `paramName` is the route parameter key that must have a value to navigate to `routeName` or its child routes.

##### Splats
The `r` function has a function property `r.splat(routeName: string, [options: RouteOptions])`. Splats will match anything and that variable segment aligns with the `NavigationEntry` via the `splat: string` property. Splats cannot have children.

##### Redirects
The `r` function has a function property `r.redirect(path: string, route: NavigationEntry)`. When sent to that `path`, the router will follow the given `route` to a route that cannot redirect. Redirect loops are not possible because redirects are not named. An error throws if a redirect points to a route that was not defined in the routing table.

### Universal methods
Both client-side and server-side support these methods.

#### `router.getRouteUrl(route: NavigationEntry): string`
This method returns the `route` URL, or `null` if there is no matching route.

#### `router.getUrlRoute(url: string): NavigationEntry`
This method returns the URL's route, or `null` if there is no matching route.

#### `router.isRouteEqual(routeX: NavigationEntry, routeY: NavigationEntry): boolean`
This method returns whether to routes are equal. A route X is equal to route Y when their `route` is equal, `splat` is equal, and their **serialized** `routeParams` and `queryParams` are equal.

#### `router.isRouteWithin(routeX: NavigationEntry, routeY: NavigationEntry): boolean`
Returns whether `routeX` is within `routeY`. A route X is within route Y when:

1. Y has no query parameters and Y's path is a base path of X. For example,
   `/a/b` is within `/a`, but not within `/a?yes=no`.
2. Y and X have the same path and X has query parameters which are a proper subset of the query parameters Y has. For example, `/a?i=1` is within `/a` but not within `/a?i=1` or `/a?i=1&j=2`.

This is useful for top-level links, such as `example.com/docs`. You would like to know that the current route exists within `/docs` to highlight the top link a certain way. Using `route.isRouteWithin()` allows us not to keep track of every possible child route of the `/docs` route or have to manually slice on the current URL.

### Client-side methods
The following methods are for client-side applications and will throw an error if used on the server-side.

#### `router.onNavigation(listener: function)`
This method subscribes the `listener` to all new navigation route changes. The listener will receive the `route` containing a `NavigationEntry`.

`NavigationEntry` is a map of the following properties:

| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `route` | string | **required** | Name for the route
| `splat` | string | *none* | Splat string for the route
| `routeParams` | object | `{}` | Route parameters for the route
| `queryParams` | object | `{}` | Query parameters for the route
| `redirect` | boolean | `false` | Whether the route was the result of a redirect

**Note:** When the listener receives `null` this indicates navigation to
a URL without a matching route.

**Note:** To remove the subscription, call `router.offNavigation()` with the same listener function.

#### `router.warnOnNavigation(message: string)`
This method will set a flag with the `message` on the current route. When navigating away from current route, the user must confirm they want to leave the current "page" before the navigation occurs. The next route will not warn, unless you call `warnOnNavigation` for that route. You can call this method repeated without side-effects if the message needs changed over time for the same route. An empty string `""` will show the default browser message, which is best if you are not localizing your message. To cancel a set warning, call `warnOnNavigation(false)`.

**Aside:** This is good for when someone is editing a form and tries to leave before they submit it. From a UI/UX standpoint use it sparingly. You should be saving draft versions of critical form data because the user will not get a prompt if the program or computer dies or breaks. Users hate popup dialogues so if you use them too much or incorrectly they will block your pages from using popups at all. Any resulting poor experiences are on you.

#### `router.initialize()`
This method reads the current location and fires `onNavigation` events to all listeners with the initial route. This should fire on client-side startup. This throws an error when called on the server.

#### `router.interceptLinkClicks()`
This method attaches an event listener to the top-level `window.document`, which
will trigger `onNavigation` events when the destination URL with within the router's `basePath`. This throws an error when called on the server.

**Note:** To remove the listener, call `router.interceptLinkClicks(false)`.

#### `router.onClick(event: MouseEvent)`
This is a convenience function that attaches directly to links via `onclick=` or `addEventListener()`. It does the same as `router.interceptLinkClicks()` for single elements.

**Aside:** Without using the above click handlers, you could run into trouble with `event.target`. Rove handlers recurse up from the original target looking for the immediate `<a>` parent. This consideration is important for `<a>` nodes which containing other potential click targets. You can build your own handlers, but be aware of that edge case.

#### `route.navigateTo(route: NavigationOptions)`
This method will trigger an `onNavigation` event with the new route. This method will throw an error if `route.route` is not a route in the routing table, which is for developer sanity but also enforcing static route names.

`NavigationOptions` is a map of the following options:

| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `route` | string | **required** | Name for the route
| `splat` | string | *none* | Splat string for the route
| `routeParams` | object | `{}` | Route parameters for the route
| `queryParams` | object | `{}` | Query parameters for the route
| `replace` | boolean | `false` | Whether to replace the previous history state in the browser's history stack

#### `router.getCurrentRoute(): NavigationEntry`
This method returns the current route, which is the last `onNavigation` entry.

#### `router.isRouteActive(route: NavigationEntry): boolean`
This method returns whether the `route` is equal to the current route.

**Note:** This is `x => router.isRouteEqual(router.getCurrentRoute(),  x)`.

#### `router.isCurrentRouteWithin(route: NavigationEntry): boolean`
This method returns whether the current route is within the given `route`.

**Note:** This is `x => router.isRouteWithin(router.getCurrentRoute(),  x)`.

## Contributing
Contributions are incredibly welcome as long as they are standardly applicable and pass the tests (or break bad ones). Tests are in AVA.

```bash
# running tests
npm run test
```

Follow me on [Twitter](https://twitter.com/compooter) for updates or for the lolz and please check out my other [repositories](https://github.com/andrejewski) if I have earned it. I thank you for reading.
