/**
 * Created by jane on 20/04/2018.
 */

const noop = function () {

}

export const ajax = function ({
    method = 'GET',
    url = '',
    async = true,
    callback = noop
}={}) {

    const xhr = new XMLHttpRequest
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            callback(xhr.responseText)
        }
    }
    xhr.open(method, url, async)
    xhr.send()
}

export const deepCopy = function (origin) {
    let copy = null


    return copy
}

export const copy = function (origin) {
    // null
    if (origin === null) return null

    // primitive and function
    if (typeof origin !== 'object') return origin





    return origin
}
