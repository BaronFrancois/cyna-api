import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument = require('pdfkit');

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  findAllForUser(userId: number) {
    return this.prisma.invoice.findMany({
      where: { userId },
      include: { order: { include: { items: true } } },
      orderBy: { issuedAt: 'desc' },
    });
  }

  findAll() {
    return this.prisma.invoice.findMany({
      include: { user: { select: { id: true, email: true } }, order: true },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async findOne(id: number, userId?: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { order: { include: { items: true } } },
    });
    if (!invoice) throw new NotFoundException('Facture introuvable');
    if (userId && invoice.userId !== userId) throw new ForbiddenException();
    return invoice;
  }

  async generatePdfBuffer(id: number, userId: number): Promise<Buffer> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        order: {
          include: {
            items: {
              include: { product: true, subscriptionPlan: true },
            },
          },
        },
      },
    });
    if (!invoice) throw new NotFoundException('Facture introuvable');
    if (invoice.userId !== userId) throw new ForbiddenException();

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const PURPLE = '#7C3AED';
      const DARK = '#1A1A2E';
      const GRAY = '#6B7280';
      const LIGHT = '#F3F4F6';

      // Header band
      doc.rect(0, 0, 595, 80).fill(DARK);
      doc.fontSize(22).fillColor('#FFFFFF').font('Helvetica-Bold').text('CYNA', 50, 28);
      doc.fontSize(9).fillColor('#A78BFA').font('Helvetica').text('Cybersecurity Solutions', 50, 54);
      doc.fontSize(18).fillColor('#FFFFFF').font('Helvetica-Bold').text('FACTURE', 0, 30, { align: 'right', width: 545 });

      // Invoice meta
      const issuedDate = new Date(invoice.issuedAt).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric',
      });
      doc.fillColor(GRAY).fontSize(9).font('Helvetica')
        .text(`N° ${invoice.invoiceNumber}`, 0, 54, { align: 'right', width: 545 });

      // Client block
      doc.moveDown(3);
      const clientY = doc.y;
      doc.fontSize(10).fillColor(GRAY).font('Helvetica').text('FACTURÉ À', 50, clientY);
      doc.fontSize(11).fillColor(DARK).font('Helvetica-Bold')
        .text(`${invoice.user.firstName ?? ''} ${invoice.user.lastName ?? ''}`.trim() || invoice.user.email, 50, clientY + 16);
      doc.fontSize(10).fillColor(GRAY).font('Helvetica').text(invoice.user.email, 50, clientY + 32);

      // Date block (right side)
      doc.fontSize(10).fillColor(GRAY).font('Helvetica').text('DATE D\'ÉMISSION', 370, clientY);
      doc.fontSize(11).fillColor(DARK).font('Helvetica-Bold').text(issuedDate, 370, clientY + 16);

      // Separator
      doc.moveTo(50, clientY + 60).lineTo(545, clientY + 60).stroke(LIGHT);

      // Table header
      const tableTop = clientY + 75;
      doc.rect(50, tableTop, 495, 24).fill(PURPLE);
      doc.fontSize(9).fillColor('#FFFFFF').font('Helvetica-Bold')
        .text('DESCRIPTION', 60, tableTop + 7)
        .text('PLAN', 280, tableTop + 7)
        .text('QTÉ', 370, tableTop + 7)
        .text('P.U. HT', 410, tableTop + 7)
        .text('TOTAL HT', 460, tableTop + 7);

      // Table rows
      let rowY = tableTop + 24;
      let rowIndex = 0;
      for (const item of invoice.order.items) {
        const bg = rowIndex % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
        doc.rect(50, rowY, 495, 22).fill(bg);
        doc.fontSize(9).fillColor(DARK).font('Helvetica')
          .text(item.productName, 60, rowY + 6, { width: 210, ellipsis: true })
          .text(item.planLabel, 280, rowY + 6, { width: 80, ellipsis: true })
          .text(String(item.quantity), 370, rowY + 6)
          .text(`${Number(item.unitPrice).toFixed(2)} €`, 410, rowY + 6)
          .text(`${Number(item.totalPrice).toFixed(2)} €`, 460, rowY + 6);
        rowY += 22;
        rowIndex++;
      }

      // Total section
      const subtotal = Number(invoice.order.subtotal);
      const tax = Number(invoice.order.taxAmount);
      const total = Number(invoice.amount);

      rowY += 10;
      doc.moveTo(350, rowY).lineTo(545, rowY).stroke(LIGHT);
      rowY += 8;

      doc.fontSize(9).fillColor(GRAY).font('Helvetica')
        .text('Sous-total HT', 350, rowY).text(`${subtotal.toFixed(2)} €`, 490, rowY, { align: 'right', width: 55 });
      rowY += 16;
      doc.text('TVA (20%)', 350, rowY).text(`${tax.toFixed(2)} €`, 490, rowY, { align: 'right', width: 55 });
      rowY += 8;
      doc.moveTo(350, rowY).lineTo(545, rowY).stroke(LIGHT);
      rowY += 8;

      doc.rect(350, rowY, 195, 26).fill(PURPLE);
      doc.fontSize(11).fillColor('#FFFFFF').font('Helvetica-Bold')
        .text('TOTAL TTC', 358, rowY + 7)
        .text(`${total.toFixed(2)} €`, 358, rowY + 7, { align: 'right', width: 179 });

      // Footer
      doc.fontSize(8).fillColor(GRAY).font('Helvetica')
        .text('Cyna SAS — contact@cyna-it.fr — www.cyna-it.fr', 50, 760, { align: 'center', width: 495 })
        .text('Document généré automatiquement — non soumis à TVA si auto-entrepreneur', 50, 772, { align: 'center', width: 495 });

      doc.end();
    });
  }
}
