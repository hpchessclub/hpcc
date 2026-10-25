from pathlib import Path
from html import escape
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
root=Path(__file__).resolve().parents[1]
styles=getSampleStyleSheet();styles.add(ParagraphStyle(name='ClubTitle',fontName='Helvetica-Bold',fontSize=24,leading=29,spaceAfter=16,textColor=colors.HexColor('#234c35')));styles.add(ParagraphStyle(name='ClubHeading',fontName='Helvetica-Bold',fontSize=13,leading=18,spaceBefore=13,spaceAfter=7,keepWithNext=True,textColor=colors.HexColor('#234c35')));styles.add(ParagraphStyle(name='ClubBody',fontName='Helvetica',fontSize=10,leading=15,spaceAfter=9));styles.add(ParagraphStyle(name='ClubNote',fontName='Helvetica',fontSize=8,leading=12,spaceAfter=12,textColor=colors.HexColor('#536356')))
def footer(c,d):
 c.setStrokeColor(colors.HexColor('#b9d4b6'));c.line(42,43,A4[0]-42,43);c.setFillColor(colors.HexColor('#536356'));c.setFont('Helvetica',8);c.drawString(42,29,'HPCC | Revision 2026.10.25 | 25 October 2026');c.drawRightString(A4[0]-42,29,str(d.page))
for slug in ['hpcc_deployment_guide','hpcc_admin_super_admin_user_guide']:
 text=(root/'docs'/f'{slug}.md').read_text();story=[];title=text.splitlines()[0].lstrip('# ')
 for block in text.split('\n\n'):
  lines=block.strip().splitlines()
  if not lines:continue
  if lines[0].startswith('# '):
   story.append(Paragraph(escape(lines[0][2:]),styles['ClubTitle']));story.extend(Paragraph(escape(l),styles['ClubNote']) for l in lines[1:]);continue
  if lines[0].startswith('## '):
   story.append(Paragraph(escape(lines[0][3:]),styles['ClubHeading']));lines=lines[1:]
  if lines:story.append(Paragraph(escape(' '.join(lines)),styles['ClubBody']))
 output=root/'public/docs'/f'{slug}.pdf';output.parent.mkdir(parents=True,exist_ok=True);SimpleDocTemplate(str(output),pagesize=A4,leftMargin=42,rightMargin=42,topMargin=42,bottomMargin=59,title=title,author='Howick-Pakuranga Chess Club').build(story,onFirstPage=footer,onLaterPages=footer)
 print(output.name)
