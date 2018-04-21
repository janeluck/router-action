
const log = console.log
const p = new Promise(resolve => {
    log(0)
    log('promise inter')

    setTimeout(()=>{
        log(2)
        log('before resolve')
        setTimeout(()=>{
            log(4)
        })
    })
    resolve()
    setTimeout(()=>{
        log(3)
        log('settimeout consoled')
        setTimeout(()=>{
            log(5)
        })
    })
})


p.then(() => {
   log(1)
   log('then consoled')
})
