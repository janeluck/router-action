import _ from 'lodash'

function newTask(task1, task2, task3, task4, task5) {
    var taskNum = arguments.length
    var rejected = false

    Promise.all([task1, task2, task3, task4, task5]).then(values => {

        while (taskNum || !rejected) {


        }
    })


}

{
    task: proxy,

}


const HandleTaskPool = function (taskArr) {
    return new Promise(function (resolve, reject) {
        var taskNum = taskArr.length
        var rejected = false
        Promise.all(_.map(taskArr, 'task')).then(values => {


            while (taskNum || !rejected) {


            }



        })
    })
}