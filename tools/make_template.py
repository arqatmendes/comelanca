"""Gera www/templates/modelo-pratos-comelanca.xlsx (planilha modelo para cadastrar pratos).

Uso: python3 tools/make_template.py
"""
import os
from openpyxl import Workbook
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'www', 'templates', 'modelo-pratos-comelanca.xlsx')
F = 'Arial'
ROWS = 200

wb = Workbook()
ws = wb.active
ws.title = 'Pratos'
hdr = ['Prato', 'Ingredientes principais (separe por vírgula)', 'Café da manhã', 'Lanche da manhã', 'Almoço',
       'Lanche da tarde', 'Janta', 'Quem gosta', 'Última vez que comeram (dd/mm/aaaa)', 'Observações']
widths = [30, 42, 13, 13, 11, 13, 11, 24, 22, 36]
thin = Side(style='thin', color='BBBBBB')
border = Border(left=thin, right=thin, top=thin, bottom=thin)
for i, h in enumerate(hdr, 1):
    c = ws.cell(1, i, h)
    c.font = Font(name=F, bold=True, color='FFFFFF')
    c.fill = PatternFill('solid', fgColor='7E9F7A')
    c.alignment = Alignment(wrap_text=True, vertical='center', horizontal='center')
    c.border = border
    ws.column_dimensions[c.column_letter].width = widths[i - 1]
ws.row_dimensions[1].height = 38
ws['H1'].comment = Comment('Escreva os nomes das crianças separados por vírgula (ex.: Ana, Pedro) ou "Todos". '
                           'Em branco = todas as crianças.', 'Comelança')
ws['A1'].comment = Comment('As linhas que começam com "Exemplo:" são ignoradas na importação.', 'Comelança')

examples = [
    ['Exemplo: Panqueca de banana', 'banana, ovo, aveia', 'X', 'X', '', 'X', '', 'Todos', '20/10/2026', 'Servir com mel'],
    ['Exemplo: Arroz, feijão e frango desfiado', 'arroz, feijão, frango', '', '', 'X', '', 'X', 'Todos', '', 'Feijão batido e coado'],
]
for r, row in enumerate(examples, 2):
    for i, v in enumerate(row, 1):
        c = ws.cell(r, i, v)
        c.font = Font(name=F, italic=True, color='8A8A8A')
        c.border = border
        if 3 <= i <= 7:
            c.alignment = Alignment(horizontal='center')

fill = PatternFill('solid', fgColor='FFF8E1')
for r in range(4, 4 + ROWS):
    for i in range(1, 11):
        c = ws.cell(r, i)
        c.fill = fill
        c.font = Font(name=F)
        c.border = border
        if 3 <= i <= 7:
            c.alignment = Alignment(horizontal='center')
    ws.cell(r, 9).number_format = 'DD/MM/YYYY'

last = 3 + ROWS
dv = DataValidation(type='list', formula1='"X"', allow_blank=True, showErrorMessage=True,
                    errorTitle='Marque com X', error='Use X para marcar a refeição, ou deixe em branco.')
ws.add_data_validation(dv)
dv.add(f'C2:G{last}')
ws.freeze_panes = 'B2'
ws.auto_filter.ref = f'A1:J{last}'

ins = wb.create_sheet('Como preencher')
lines = [
    ('Como preencher a planilha do Comelança', True, 14),
    ('', False, 11),
    ('1. Use a aba "Pratos". Preencha a partir da linha 4 (células amarelas). As linhas cinzas que começam com "Exemplo:" são ignoradas.', False, 11),
    ('2. Prato: o nome como vocês chamam em casa (ex.: "Macarrão com queijo").', False, 11),
    ('3. Ingredientes principais: os que caracterizam o prato, separados por vírgula. São usados nas alergias e na busca de receitas novas.', False, 11),
    ('4. Refeições: marque X em todas as refeições em que costumam servir o prato (pode ser mais de uma).', False, 11),
    ('5. Quem gosta: nomes das crianças separados por vírgula (iguais aos cadastrados no app), ou "Todos". Em branco = todas.', False, 11),
    ('6. Última vez que comeram: opcional, no formato dd/mm/aaaa. Ajuda o app a saber o que está há mais tempo sem aparecer.', False, 11),
    ('7. Observações: opcional (preferências, modo de preparo, "sem cebola" etc.).', False, 11),
    ('', False, 11),
    ('Depois de preencher: no app, abra a aba Pratos → "Enviar Excel preenchido" e escolha este arquivo.', True, 11),
    ('Pratos com o mesmo nome de um prato que já existe no app não são duplicados.', False, 11),
]
for r, (txt, bold, size) in enumerate(lines, 1):
    c = ins.cell(r, 1, txt)
    c.font = Font(name=F, bold=bold, size=size)
    c.alignment = Alignment(wrap_text=True, vertical='top')
ins.column_dimensions['A'].width = 110
wb.active = 0

os.makedirs(os.path.dirname(OUT), exist_ok=True)
wb.save(OUT)
print('ok', os.path.abspath(OUT))
