
// setTimeout第二个参数没有指定 也至少有4ms的延迟, 所以先执行的resolve
// 没有想象中那么复杂, 抽丝剥茧下来都理的通

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
