'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

export function InvoicePreview() {
  const t = useTranslations('landing')
  const invoiceItems = [
    { name: t('invoicePremiumMulch'), qty: 15, unit: t('invoiceBags'), rate: 4.98, total: 74.70 },
    { name: t('invoiceTopsoil'), qty: 20, unit: t('invoiceBags'), rate: 2.50, total: 50.00 },
    { name: t('invoiceEdging'), qty: 80, unit: t('invoiceFt'), rate: 0.89, total: 71.20 },
    { name: t('invoiceRiverRock'), qty: 12, unit: t('invoiceBags'), rate: 5.98, total: 71.76 },
    { name: t('invoiceWeedBarrier'), qty: 2, unit: t('invoiceRolls'), rate: 29.98, total: 59.96 },
    { name: t('invoiceLabor'), qty: 16, unit: t('invoiceHrs'), rate: 45.00, total: 720.00 },
  ]
  
  const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0)
  const tax = subtotal * 0.0825
  const total = subtotal + tax
  
  return (
    <Card className="shadow-xl border-2 hover:shadow-2xl transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold mb-1">{t('invoiceBusinessName')}</h3>
            <p className="text-sm text-muted-foreground">{t('invoiceAddress')}</p>
          </div>
          <Badge className="bg-primary text-primary-foreground">{t('invoiceLabel')}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">{t('invoiceNumber')}</p>
            <p className="font-semibold">INV-2024-0847</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('invoiceDate')}</p>
            <p className="font-semibold">Nov 19, 2024</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold text-muted-foreground border-b">
            <div className="col-span-5">{t('invoiceItem')}</div>
            <div className="col-span-2 text-center">{t('invoiceQty')}</div>
            <div className="col-span-2 text-right">{t('invoiceRate')}</div>
            <div className="col-span-3 text-right">{t('invoiceAmount')}</div>
          </div>
          
          {invoiceItems.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm border-b last:border-0">
              <div className="col-span-5 font-medium">{item.name}</div>
              <div className="col-span-2 text-center text-muted-foreground">
                {item.qty} {item.unit}
              </div>
              <div className="col-span-2 text-right text-muted-foreground">
                ${item.rate.toFixed(2)}
              </div>
              <div className="col-span-3 text-right font-semibold">
                ${item.total.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
        
        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('invoiceSubtotal')}</span>
            <span className="font-semibold">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('invoiceTax')}</span>
            <span className="font-semibold">${tax.toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>{t('invoiceTotal')}</span>
            <span className="text-primary">${total.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="mt-4 rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground">
          <p className="font-medium mb-1">{t('invoicePaymentTerms')}</p>
          <p>{t('invoiceTermsText')}</p>
        </div>
      </CardContent>
    </Card>
  )
}
