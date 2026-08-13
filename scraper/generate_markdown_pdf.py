from markdown_pdf import MarkdownPdf
from markdown_pdf import Section
import codecs

md_path = r'C:\Users\jrbri\.gemini\antigravity\brain\4e077980-55c5-4679-bd1f-3344bb9be29c\scraped_data.md'
with codecs.open(md_path, 'r', 'utf-8') as f:
    text = f.read()

# Add a title
styled_text = f"# Competitor Social Media Content Report\n\n{text}"

pdf = MarkdownPdf(toc_level=2)
pdf.add_section(Section(styled_text))
pdf.meta["title"] = "Competitor Social Media Content Report"
pdf.meta["author"] = "Content Spy"

pdf.save(r'C:\Users\jrbri\Desktop\Content Spy\Competitor_Content_Report.pdf')
print("PDF generated successfully.")
