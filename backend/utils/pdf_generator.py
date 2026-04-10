"""
PDF Statement Generator
Generates professional bank statements with account details, transactions, and balances
"""
import io
from datetime import datetime
from typing import List, Dict, Any
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.platypus import Image as RLImage
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.pdfgen import canvas
import logging

logger = logging.getLogger(__name__)


class StatementPDFGenerator:
    """Generate professional PDF statements for bank accounts"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#0073CF'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        # Subtitle style
        self.styles.add(ParagraphStyle(
            name='CustomSubtitle',
            parent=self.styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor('#6B6B6B'),
            spaceAfter=20,
            alignment=TA_CENTER
        ))
        
        # Section header
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#0073CF'),
            spaceAfter=12,
            spaceBefore=20,
            fontName='Helvetica-Bold'
        ))
        
        # Account info
        self.styles.add(ParagraphStyle(
            name='AccountInfo',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#2C2C2C'),
            spaceAfter=6
        ))
    
    def generate_statement(
        self,
        user_data: Dict[str, Any],
        accounts_data: List[Dict[str, Any]],
        start_date: datetime,
        end_date: datetime
    ) -> bytes:
        """
        Generate a comprehensive PDF statement for all user accounts
        
        Args:
            user_data: User information (name, email, address, etc.)
            accounts_data: List of account dictionaries with transactions
            start_date: Statement period start date
            end_date: Statement period end date
            
        Returns:
            bytes: PDF file content
        """
        buffer = io.BytesIO()
        
        # Create PDF document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=0.75*inch,
            bottomMargin=0.75*inch
        )
        
        # Container for PDF elements
        elements = []
        
        # Add header
        elements.extend(self._create_header(user_data, start_date, end_date))
        
        # Add account summaries
        for idx, account in enumerate(accounts_data):
            if idx > 0:
                elements.append(PageBreak())
            elements.extend(self._create_account_section(account, start_date, end_date))
        
        # Add footer information
        elements.extend(self._create_footer())
        
        # Build PDF
        doc.build(elements, onFirstPage=self._add_page_number, onLaterPages=self._add_page_number)
        
        # Get PDF bytes
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return pdf_bytes
    
    def _create_header(self, user_data: Dict[str, Any], start_date: datetime, end_date: datetime) -> List:
        """Create statement header with bank logo and user info"""
        elements = []
        
        # Bank name/logo
        title = Paragraph("SCIB Bank", self.styles['CustomTitle'])
        elements.append(title)
        
        # Statement title
        subtitle = Paragraph(
            f"Account Statement<br/>{start_date.strftime('%B %d, %Y')} - {end_date.strftime('%B %d, %Y')}",
            self.styles['CustomSubtitle']
        )
        elements.append(subtitle)
        elements.append(Spacer(1, 0.3*inch))
        
        # User information
        user_name = f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip()
        user_email = user_data.get('email', '')
        
        user_info_data = [
            ['Account Holder:', user_name],
            ['Email:', user_email],
            ['Statement Date:', datetime.now().strftime('%B %d, %Y')],
            ['Statement Period:', f"{start_date.strftime('%b %d, %Y')} - {end_date.strftime('%b %d, %Y')}"]
        ]
        
        user_table = Table(user_info_data, colWidths=[2*inch, 4*inch])
        user_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#6B6B6B')),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#2C2C2C')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elements.append(user_table)
        elements.append(Spacer(1, 0.4*inch))
        
        return elements
    
    def _create_account_section(self, account: Dict[str, Any], start_date: datetime, end_date: datetime) -> List:
        """Create section for a single account"""
        elements = []
        
        # Account header
        account_type = account.get('type', 'Account').title()
        account_number = account.get('account_number', 'N/A')
        masked_number = f"****{account_number[-4:]}" if len(account_number) > 4 else account_number
        
        header = Paragraph(
            f"{account_type} Account - {masked_number}",
            self.styles['SectionHeader']
        )
        elements.append(header)
        
        # Account details
        currency = account.get('currency', 'USD')
        opening_balance = account.get('opening_balance', 0.0)
        closing_balance = account.get('closing_balance', 0.0)
        total_credits = account.get('total_credits', 0.0)
        total_debits = account.get('total_debits', 0.0)
        
        summary_data = [
            ['Opening Balance:', f"{currency} {opening_balance:,.2f}"],
            ['Total Credits:', f"{currency} {total_credits:,.2f}"],
            ['Total Debits:', f"{currency} {total_debits:,.2f}"],
            ['Closing Balance:', f"{currency} {closing_balance:,.2f}"],
        ]
        
        summary_table = Table(summary_data, colWidths=[2*inch, 2*inch])
        summary_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#2C2C2C')),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LINEBELOW', (0, -1), (-1, -1), 2, colors.HexColor('#0073CF')),
        ]))
        
        elements.append(summary_table)
        elements.append(Spacer(1, 0.3*inch))
        
        # Transactions table
        transactions = account.get('transactions', [])
        
        if transactions:
            elements.append(Paragraph("Transaction History", self.styles['SectionHeader']))
            
            # Table header
            trans_data = [['Date', 'Description', 'Reference', 'Debit', 'Credit', 'Balance']]
            
            # Add transactions
            for trans in transactions:
                date_str = trans.get('date', '')
                if isinstance(date_str, datetime):
                    date_str = date_str.strftime('%m/%d/%Y')
                elif isinstance(date_str, str) and 'T' in date_str:
                    try:
                        date_str = datetime.fromisoformat(date_str.replace('Z', '+00:00')).strftime('%m/%d/%Y')
                    except:
                        pass
                
                description = trans.get('description', '')[:30]  # Truncate long descriptions
                reference = trans.get('reference_number', '')[:15]
                amount = trans.get('amount', 0.0)
                balance = trans.get('balance_after', 0.0)
                
                # Determine debit/credit
                debit = f"{currency} {abs(amount):,.2f}" if amount < 0 else ''
                credit = f"{currency} {amount:,.2f}" if amount >= 0 else ''
                
                trans_data.append([
                    date_str,
                    description,
                    reference,
                    debit,
                    credit,
                    f"{currency} {balance:,.2f}"
                ])
            
            # Create transactions table
            trans_table = Table(trans_data, colWidths=[0.9*inch, 1.8*inch, 1.2*inch, 1*inch, 1*inch, 1*inch])
            trans_table.setStyle(TableStyle([
                # Header row
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0073CF')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                
                # Data rows
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#2C2C2C')),
                ('ALIGN', (3, 1), (-1, -1), 'RIGHT'),  # Right align amounts
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
                ('TOPPADDING', (0, 1), (-1, -1), 6),
                
                # Grid
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
                
                # Alternating row colors
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9FAFB')]),
            ]))
            
            elements.append(trans_table)
        else:
            elements.append(Paragraph("No transactions during this period.", self.styles['AccountInfo']))
        
        return elements
    
    def _create_footer(self) -> List:
        """Create statement footer with disclaimers"""
        elements = []
        
        elements.append(Spacer(1, 0.5*inch))
        
        footer_text = """
        <para align=center fontSize=8 textColor=#6B6B6B>
        This is a computer-generated statement and does not require a signature.<br/>
        For questions or concerns, please contact customer service or visit your nearest branch.<br/>
        <br/>
        © 2026 SCIB Bank. All rights reserved.<br/>
        Confidential - For account holder use only.
        </para>
        """
        
        elements.append(Paragraph(footer_text, self.styles['Normal']))
        
        return elements
    
    def _add_page_number(self, canvas, doc):
        """Add page numbers to each page"""
        page_num = canvas.getPageNumber()
        text = f"Page {page_num}"
        canvas.saveState()
        canvas.setFont('Helvetica', 9)
        canvas.setFillColor(colors.HexColor('#6B6B6B'))
        canvas.drawRightString(7.5*inch, 0.5*inch, text)
        canvas.restoreState()


# Convenience function
def generate_statement_pdf(
    user_data: Dict[str, Any],
    accounts_data: List[Dict[str, Any]],
    start_date: datetime,
    end_date: datetime
) -> bytes:
    """
    Generate a PDF statement
    
    Args:
        user_data: User information
        accounts_data: List of accounts with transactions
        start_date: Statement start date
        end_date: Statement end date
        
    Returns:
        bytes: PDF content
    """
    generator = StatementPDFGenerator()
    return generator.generate_statement(user_data, accounts_data, start_date, end_date)
