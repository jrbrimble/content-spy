import markdown2
from fpdf import FPDF
import codecs

# Read the markdown
md_path = r'C:\Users\jrbri\.gemini\antigravity\brain\4e077980-55c5-4679-bd1f-3344bb9be29c\scraped_data.md'
with codecs.open(md_path, 'r', 'utf-8') as f:
    text = f.read()

# Convert markdown to html
html = markdown2.markdown(text)

# We can wrap it in some basic HTML styling
# But fpdf's write_html doesn't support complex CSS. It supports basic tags: b, i, u, a, p, h1-h6, etc.
# We will create a subclass of FPDF for a styled header/footer
class PDF(FPDF):
    def header(self):
        # Set font
        self.set_font('helvetica', 'B', 20)
        # Title
        self.cell(0, 10, 'Competitor Social Media Content Report', border=0, align='C')
        self.ln(20)

    def footer(self):
        # Go to 1.5 cm from bottom
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        # Page number
        self.cell(0, 10, f'Page {self.page_no()}/{{nb}}', align='C')

pdf = PDF()
pdf.add_page()
pdf.set_font("helvetica", size=11)
pdf.set_auto_page_break(auto=True, margin=15)
pdf.write_html(html)

pdf.output(r'C:\Users\jrbri\Desktop\Content Spy\Competitor_Content_Report.pdf')
print("PDF generated successfully.")
