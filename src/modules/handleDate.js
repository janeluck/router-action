import moment from 'moment'

function getSpecialDate(step, basicDate, format) {
    basicDate = basicDate || moment()
    format = format || 'YYYY-MM-DD'
    return basicDate['add'](step, 'd').format(format)
}


const format = 'YYYY-MM-DD'

function getSpecialRange(step) {

    const endDate = moment().format(format)
    const beginDate = moment(endDate).add(step, 'd').format(format)
    const compareEndDate = moment(beginDate).add(-1, 'd').format(format)
    const compareBeginDate = moment(compareEndDate).add(step, 'd').format(format)
    return {
        beginDate,
        compareBeginDate,
        compareEndDate,
        endDate,
    }
}




function getSpecialDateRange(step, basicDate, format) {
    format = format || 'YYYY-MM-DD'
    basicDate = basicDate || moment()
    const endDate = basicDate.format(format)
    const beginDate = moment(endDate).subtract(Number(step), 'd').format(format)
    const compareEndDate = moment(beginDate).subtract(1, 'd').format(format)
    const compareBeginDate = moment(compareEndDate).subtract(Number(step), 'd').format(format)
    return {
        beginDate,
        endDate,
        compareBeginDate,
        compareEndDate,
    }
}


