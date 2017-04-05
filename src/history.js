export default class History {
  constructor (onNavigation) {
    this.onNavigation = onNavigation
    this._window = window
    this.strategy = this._strategy()
    this.onChange = this._onChange.bind(this)
  }

  _strategy () {
    if (this._window.history && this._window.history.pushState) return 'push'
    if ('onhashchange' in this._window) return 'hash'
    return 'poll'
  }

  /* url->href */
  externalizeUrl (basePath, path) {
    if (this.strategy === 'push') {
      return path
    }
    return `${basePath}#!${path.slice(basePath.length)}`
  }

  /* href->url */
  internalizeUrl (basePath, path) {
    if (this.strategy === 'push') {
      return path
    }
    const root = `${basePath}#!`
    if (path.indexOf(root) !== 0) {
      return path
    }
    return `${basePath}${path.slice(root.length)}`
  }

  _onChange () {
    let path
    switch (this.strategy) {
      case 'push':
        const {href, origin} = this._window.location
        path = href.slice(origin.length)
        break
      case 'hash':
      case 'poll':
        path = this._window.location.hash.slice(2)
    }
    this.onNavigation(path)
  }

  update (path, title, replace) {
    switch (this.strategy) {
      case 'push':
        if (replace) {
          this._window.history.replaceState({}, title, path)
        } else {
          this._window.history.pushState({}, title, path)
        }
        break
      case 'hash':
      case 'poll':
        this._window.location.hash = '#!' + path
    }
  }

  attach () {
    switch (this.strategy) {
      case 'push':
        this._window.addEventListener('popstate', this.onChange)
        break
      case 'hash':
        this._window.addEventListener('hashchange', this.onChange)
        break
      case 'poll':
        this._hashPoll = setTimeout(() => {
          const prev = this._previousHashPoll
          const hash = this._window.location.hash
          if (prev && prev !== hash) {
            this.onChange()
          }
          this._previousHashPoll = hash
        }, 300)
    }
  }

  detach () {
    switch (this.strategy) {
      case 'push':
        this._window.removeEventListener('popstate', this.onChange)
        break
      case 'hash':
        this._window.removeEventListener('hashchange', this.onChange)
        break
      case 'poll':
        clearInterval(this._hashPoll)
    }
  }
}
