#!/bin/bash
log=~/ABell/updateLog

function handleCommandResult {
  if [ `echo $?` -ne 0 ]; then
    echo 'Fatal'
    osascript -e 'display alert "Fatal" message "fatal in ESN.REN  build"  as critical'
    exit 1
  else
    echo '\n' >>$log
  fi
}

Branch="ck_ren_v2.3.1"


# log run date and clean last message
echo "--------------------------------start RenUpdate--------------------------------------------"
date>>$log

cd ~/fe-site-ck
git checkout $Branch
echo "----------update from remote, git pull origin \"$Branch\" :" >> $log
git pull origin $Branch >> $log 2>&1
handleCommandResult


echo "----------git merge -X theirs ck_v2.3.1 :" >> $log
git merge -X theirs ck_v2.3.1 >> $log 2>&1
handleCommandResult


echo "----------start esn.ren build main.js :" >> $log
npm run ren >> $log 2>&1
handleCommandResult

echo "----------git add, commit and push :" >> $log
git add * >> $log 2>&1
echo '\n' >> $log
git commit -a -m 'esn.ren: build' >> $log 2>&1
echo '\n' >> $log
git push >> $log 2>&1
handleCommandResult


echo "----------connect test environment and pull :" >> $log
sshpass -p Chaoke123 ssh root@115.29.97.238  -t 'cd /root/ck_frontend/practices  &&  git pull && exit' >> $log 2>&1
handleCommandResult


osascript -e 'display alert "Ren Environment Update Success"'
exit 0