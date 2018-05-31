import _ from 'lodash'

console.log('lo in action')

console.profile('sumBy')

_.sumBy(['2', '3.22', '1.2'], i => Number(i))

console.profileEnd('sumBy')