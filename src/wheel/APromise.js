// 实现promise A+ 规范
// resolve, reject, then链式调用, catch
//  单独使用Promise.resolve, Promise.reject的情况
// todo: all, race?
// async await实现???

// 处理异步进程, 改变代码中的地狱回调, 清晰可视化

// 缺点: then的链式回调浪费资源???


function APromise(fn) {
    var state = 'pending';
    var value;
    var deferred = null;

    function resolve(newValue) {
        if (newValue && typeof newValue.then === 'function') {
            newValue.then(resolve, reject);
            return;
        }
        state = 'resolved';
        value = newValue;

        if (deferred) {
            handle(deferred);
        }
    }

    function reject(reason) {
        state = 'rejected';
        value = reason;

        if (deferred) {
            handle(deferred);
        }
    }

    function handle(handler) {
        if (state === 'pending') {
            deferred = handler;
            return;
        }

        var handlerCallback;

        if (state === 'resolved') {
            handlerCallback = handler.onResolved;
        } else {
            handlerCallback = handler.onRejected;
        }

        if (!handlerCallback) {
            if (state === 'resolved') {
                handler.resolve(value);
            } else {
                handler.reject(value);
            }

            return;
        }

        var ret = handlerCallback(value);
        handler.resolve(ret);
    }

    this.then = function (onResolved, onRejected) {
        return new APromise(function (resolve, reject) {
            handle({
                onResolved: onResolved,
                onRejected: onRejected,
                resolve: resolve,
                reject: reject
            });
        });
    };

    fn(resolve, reject);
}


function BPromise(fn) {


    let state = 'pending',
        val,
        handler = {}


    this.then = function (onResolve, onReject) {

        handler = {
            resolve: onResolve,
            reject: onReject
        }

    }

    function resolve(val) {
        state = 'resolved'
        // 利用异步跳出当前执行栈
        setTimeout(function () {
            handler.resolve(val)
        })

    }

    function reject(val) {
        state = 'rejected'
        handler.reject(val)
    }

    fn(resolve, reject)


}

(new BPromise(function (resolve, reject) {
    console.log(111)
    resolve()

})).then(function () {
    console.log(222)
})
