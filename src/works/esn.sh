#!/bin/bash
if [ "$1" = "fwf" ]; then
    sshpass -p ZbqbnZ3rtt ssh fuwenfang@172.20.1.177
elif [ "$1" = "yxm" ]; then
    sshpass -p deyTmTdvyj ssh  yuanxiaomin@172.20.1.177
elif [ "$1" = "lsx" ]; then
    sshpass -p W4bPUW440m ssh lishangxi@172.20.1.177
elif [ "$1" = "xgl" ]; then
    sshpass -p LNfzNzOUUO ssh xiegaolei@172.20.1.177
elif [ "$1" = "ytm" ]; then
    sshpass -p hjZhWjWNWZ ssh yangtianming@172.20.1.177
elif [ "$1" = "home" ]; then
    sshpass -p janeluck20150508 ssh jianyu@123.103.9.204 -p 10022  -t 'cd ~/web_esn_new; bash -l'
else
   sshpass -p janeluck20150508 ssh jianyu@172.20.1.177 -t 'cd ~/web_esn_new; bash -l'
fi
exit 0