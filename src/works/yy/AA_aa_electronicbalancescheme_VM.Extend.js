cb.define(['common/common_VM.Extend.js'], function (common) {
  //var _util = require('../../../helpers/util');

  var AA_aa_electronicbalancescheme_VM_Extend = {
    doAction: function (name, viewmodel) {
      if (this[name])
        this[name](viewmodel);
    },


    init: function (viewmodel) {

      viewmodel.on('afterEdit', function () {
        //“方案”字段不可见
        viewmodel.get('cScheme').setVisible(false);

        var bSystemPrefabrication = viewmodel.get('bSystemPrefabrication').getValue();

        if (bSystemPrefabrication) {
          viewmodel.get('cElectronicBalanceBrand').setDisabled(true);
          viewmodel.get('cElectronicBalanceModel').setDisabled(true);
        } else {
          viewmodel.get('cElectronicBalanceBrand').setDisabled(false);
          viewmodel.get('cElectronicBalanceModel').setDisabled(false);
        }

        if (viewmodel.get('btnSave')) {
          viewmodel.get('btnSave').setVisible(true);
        }
        if (viewmodel.get('btnAbandon')) {
          viewmodel.get('btnAbandon').setVisible(true);
        }
        if (viewmodel.get('btnMatch')) {
          viewmodel.get('btnMatch').setVisible(false);
        }
        if (viewmodel.get('btnClear')) {
          viewmodel.get('btnClear').setVisible(false);
        }
      });

      viewmodel.on('afterLoadData', function () {

        //通过menuId来判断当前卡片处于哪个节点之下，若能取到menuId则说明当前为电子秤适配下的卡片页面
        if (viewmodel.getParams().menuId) {

          const config = cb.electron.getSharedObject('scaleConfig');
          const values = config && config.configurations && config.configurations[0]
          if (values) {
            viewmodel.loadData(values);
          }


          //返回
          if (viewmodel.get('btnAbandonBrowst')) {
            viewmodel.get('btnAbandonBrowst').setVisible(false);
          }
          //编辑
          if (viewmodel.get('btnEdit')) {
            viewmodel.get('btnEdit').setVisible(false);
          }
          //删除
          if (viewmodel.get('btnDelete')) {
            viewmodel.get('btnDelete').setVisible(false);
          }
          //上一张
          if (viewmodel.get('btnMoveprev')) {
            viewmodel.get('btnMoveprev').setVisible(false);
          }
          //下一张
          if (viewmodel.get('btnMovenext')) {
            viewmodel.get('btnMovenext').setVisible(false);
          }
          //保存
          if (viewmodel.get('btnSave')) {
            viewmodel.get('btnSave').setVisible(false);
          }
          //取消
          if (viewmodel.get('btnAbandon')) {
            viewmodel.get('btnAbandon').setVisible(false);
          }
          //适配本机
          if (viewmodel.get('btnMatch')) {
            viewmodel.get('btnMatch').setVisible(true);
            viewmodel.get('btnMatch').setDisabled(false);
          }
          //清除
          if (viewmodel.get('btnClear')) {
            viewmodel.get('btnClear').setVisible(true);
            viewmodel.get('btnClear').setDisabled(false);
          }
        } else {
          //“方案”字段不可见
          viewmodel.get('cScheme').setVisible(false);

          var bSystemPrefabrication = viewmodel.get('bSystemPrefabrication').getValue();

          //按钮可见性
          if (bSystemPrefabrication) { //系统预制
            if (viewmodel.getParams().mode === 'browse') {
              if (viewmodel.get('btnDelete')) {
                viewmodel.get('btnDelete').setVisible(false);
              }
              if (viewmodel.get('btnSave')) {
                viewmodel.get('btnSave').setVisible(false);
              }
              if (viewmodel.get('btnAbandon')) {
                viewmodel.get('btnAbandon').setVisible(false);
              }
              if (viewmodel.get('btnMatch')) {
                viewmodel.get('btnMatch').setVisible(false);
              }
              if (viewmodel.get('btnClear')) {
                viewmodel.get('btnClear').setVisible(false);
              }

            }
            //品牌型号不可编辑
            if (viewmodel.getParams().mode === 'edit') {
              viewmodel.get('cElectronicBalanceBrand').setDisabled(true);
              viewmodel.get('cElectronicBalanceModel').setDisabled(true);
            }
          } else { //非系统预制
            if (viewmodel.getParams().mode === 'browse') {
              if (viewmodel.get('btnSave')) {
                viewmodel.get('btnSave').setVisible(false);
              }
              if (viewmodel.get('btnAbandon')) {
                viewmodel.get('btnAbandon').setVisible(false);
              }
              if (viewmodel.get('btnMatch')) {
                viewmodel.get('btnMatch').setVisible(false);
              }
              if (viewmodel.get('btnClear')) {
                viewmodel.get('btnClear').setVisible(false);
              }
            }
          }
        }
      });


      /*
            //点击  零售管理>>电子秤适配  "方案"框选取记录后，返回内容"品牌+型号"
            //品牌和型号字段类型为enum时
            viewmodel.get('cScheme').on('afterValueChange', function (data) {
                var cElectronicBalanceBrand = viewmodel.get('cElectronicBalanceBrand').getSelectedNodes().text;
                var cElectronicBalanceModel = viewmodel.get('cElectronicBalanceModel').getSelectedNodes().text;
                var BrandAndModel = "" + cElectronicBalanceBrand + "   " + cElectronicBalanceModel;
                viewmodel.get('cScheme').setValue(BrandAndModel);
            });
            */

      //点击  零售管理>>电子秤适配  "方案"框选取记录后，返回内容"品牌+型号"
      //品牌和型号字段类型为String时
      viewmodel.get('cScheme').on('afterValueChange', function (data) {
        var cElectronicBalanceBrand = viewmodel.get('cElectronicBalanceBrand').getValue();
        var cElectronicBalanceModel = viewmodel.get('cElectronicBalanceModel').getValue();
        var BrandAndModel = '';
        if (cElectronicBalanceBrand && cElectronicBalanceModel)
          BrandAndModel = cElectronicBalanceBrand + "   " + cElectronicBalanceModel;
        else if (cElectronicBalanceBrand)
          BrandAndModel = cElectronicBalanceBrand;
        else if (cElectronicBalanceModel)
          BrandAndModel = cElectronicBalanceModel;
        viewmodel.get('cScheme').setValue(BrandAndModel);
      });


      //点击  零售管理>>电子秤适配  "方案"框选取某条记录后，在不清空框中内容的情况下再次点击参照，所有记录可见
      viewmodel.get('cScheme').on('beforeBrowse', function (data) {
        this.setState('text', null);
      });


      //电子秤适配>>[适配]按钮
      viewmodel.on('match', function () {
        var invalid = viewmodel.validate();
        if (invalid) return;


        if (!cb.electron.getSharedObject()) {
          cb.utils.alert('本地未接电子秤', 'error')
          return
        }


        var data = viewmodel.collectData(true);

        //var config = cb.electron.getSharedObject();


        // 适配时电子秤可能不给任何回应 计时1s, 不给反馈就提示消息
        /* Promise.race([new Promise(function (resolve) {
           setTimeout(function () {
             resolve({
               code: '500',
               message: '打开电子秤失败'
             })
           }, 1000)
         }, cb.electron.sendOrder('match', data))]).then(result => {
           if (result.code == 200) {
             cb.utils.alert(result.message);
             viewmodel.communication({
               type: 'modal',
               payload: {
                 key: 'ElectronicBalanceWeigh',
                 data: {
                   handleOk: function () {
                     cb.electron.sendOrder('save', data)
                     // cb.electron.sendOrder('close')
                       .then(function (result) {

                         if (result.code == 200) {
                           cb.utils.alert('适配成功，请重新进入零售开单界面', 'success')
                         } else if (result.code == 999) {
                           cb.utils.alert(`适配失败：${result.message}`, 'error')
                         }
                       })
                   },
                   handleCancel: function () {
                     cb.utils.alert('适配失败', 'error')
                     cb.electron.sendOrder('close')

                   }
                 }

               }
             });
           } else {
             cb.utils.alert(result.message||'适配失败');
           }
         })*/

        cb.electron.sendOrder('match', data)
          .then(function (result) {
            if (result.code == 200) {
              cb.utils.alert(result.message);
              viewmodel.communication({
                type: 'modal',
                payload: {
                  key: 'ElectronicBalanceWeigh',
                  data: {
                    handleOk: function () {
                      cb.electron.sendOrder('save', data)
                        .then(function (result) {
                          if (result.code == 200) {
                            cb.utils.alert('适配成功，即将重新打开应用', 'success')
                            setTimeout(() => {
                              Electron.remote.app.relaunch()
                              Electron.remote.app.exit(0)
                            }, 3000)


                          } else if (result.code == 999) {
                            cb.utils.alert(`适配失败：${result.message}`, 'error');
                            viewmodel.loadData(viewmodel.getOriginalData());
                          }
                        })
                    },
                    handleCancel: function () {
                      cb.utils.alert('适配失败', 'error');
                      viewmodel.loadData(viewmodel.getOriginalData());
                      cb.electron.sendOrder('close');

                    }
                  }

                }
              });
            } else {
              cb.utils.alert(result.message || '打开电子秤失败', 'error')
              viewmodel.loadData(viewmodel.getOriginalData());
            }
          })
      });

      //电子秤适配>>[清除]按钮
      viewmodel.on('clear', function () {
        if (!cb.electron.getSharedObject()) {
          cb.utils.alert('本地未接电子秤', 'error')
          return
        }

        cb.electron.sendOrder('clear')
          .then(function (result) {
            if (result.code == 200) {
              //viewmodel.loadData(result);
              alert(result.message);
              viewmodel.loadData();
            }
          })
      });

    }
  };

  try {
    module.exports = AA_aa_electronicbalancescheme_VM_Extend;
  } catch (error) {
  }
  return AA_aa_electronicbalancescheme_VM_Extend;
});

