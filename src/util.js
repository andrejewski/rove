export function diffFrom (obj, base) {
  if (!base) {
    return obj
  }
  const result = {}
  for (let key in obj) {
    const val = obj[key]
    if (val !== base[key]) {
      result[key] = val
    }
  }
  return result
}

export function isProperSubset (small, large) {
  let keyCount = 0
  for (let key in small) {
    if (small[key] !== large[key]) {
      return false
    }
    keyCount++
  }
  return keyCount < Object.keys(large).length
}

export function getPath (url) {
  return url.split('?')[0]
}

export function getQuery (url) {
  return url.split('?')[1]
}

export function decodeQueryParams (query) {
  if (query && query.charAt(0) === '?') {
    query = query.slice(1)
  }
  if (!query) {
    return {}
  }
  return query.split('&').reduce((obj, pair) => {
    const [key, val] = pair.split('=')
    obj[decodeURIComponent(key)] = decodeURIComponent(val)
    return obj
  }, {})
}

export function encodeQueryParams (params) {
  if (!params) {
    return ''
  }
  const keys = Object.keys(params).sort((a, b) => a.localeCompare(b))
  if (!keys.length) {
    return ''
  }
  let query = ''
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    query += `&${encodeURIComponent(key)}`
    const value = params[key]
    if (value !== void 0) {
      query += `=${encodeURIComponent(value)}`
    }
  }
  return '?' + query.slice(1)
}
