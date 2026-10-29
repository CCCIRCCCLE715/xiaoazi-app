from pathlib import Path
from datetime import datetime, date, time
from openpyxl import Workbook
from openpyxl.utils.datetime import CALENDAR_MAC_1904
import zipfile
root=Path(__file__).resolve().parent
w=Workbook(); s=w.active; s.title='工作日程'
s.append(['日期','事项','原文标记']); s.append([date(2026,10,25),'提交新版分镜，带样机','& 日 &#26085; 😀'])
s['A2'].number_format='yyyy-mm-dd'
s.append([datetime(2026,10,26,16,30),'核对字幕',None]); s['A3'].number_format='yyyy-mm-dd hh:mm'
s.append([46320,'普通数值不应转换',None]); s.append([time(9,30),'仅时间',None]); s['A5'].number_format='hh:mm'
s2=w.create_sheet('生活安排'); s2.append(['日期','事项']); s2.append([date(2026,10,27),'听音乐休息']); s2['A2'].number_format='yyyy-mm-dd'
w.save(root/'chinese-numeric-dates.xlsx')
w.epoch=CALENDAR_MAC_1904; w.save(root/'chinese-1904-dates.xlsx')
base=root/'chinese-numeric-dates.xlsx'
for name,old,new in [('hex-entities.xlsx','&#26085;','&#x65E5;'),('invalid-scalar.xlsx','&#26085;','&#xD800;'),('invalid-range.xlsx','&#26085;','&#1114112;')]:
 with zipfile.ZipFile(base) as src, zipfile.ZipFile(root/name,'w',zipfile.ZIP_DEFLATED) as out:
  for info in src.infolist():
   data=src.read(info.filename)
   if info.filename.endswith('.xml'): data=data.replace(old.encode(),new.encode())
   out.writestr(info,data)
print(root)
