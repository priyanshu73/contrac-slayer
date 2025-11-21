import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

export function InvoicePreview() {
  const invoiceItems = [
    { name: 'Premium Mulch', qty: 15, unit: 'bags', rate: 4.98, total: 74.70 },
    { name: 'Topsoil (40lb)', qty: 20, unit: 'bags', rate: 2.50, total: 50.00 },
    { name: 'Landscape Edging', qty: 80, unit: 'ft', rate: 0.89, total: 71.20 },
    { name: 'River Rock (0.5 cu ft)', qty: 12, unit: 'bags', rate: 5.98, total: 71.76 },
    { name: 'Garden Weed Barrier', qty: 2, unit: 'rolls', rate: 29.98, total: 59.96 },
    { name: 'Labor - Installation', qty: 16, unit: 'hrs', rate: 45.00, total: 720.00 },
  ]
  
  const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0)
  const tax = subtotal * 0.0825
  const total = subtotal + tax
  
  return (
    <Card className="shadow-xl border-2 hover:shadow-2xl transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold mb-1">Professional Landscaping</h3>
            <p className="text-sm text-muted-foreground">1234 Maple Street, Austin TX</p>
          </div>
          <Badge className="bg-primary text-primary-foreground">Invoice</Badge>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Invoice #</p>
            <p className="font-semibold">INV-2024-0847</p>
          </div>
          <div>
            <p className="text-muted-foreground">Date</p>
            <p className="font-semibold">Nov 19, 2024</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold text-muted-foreground border-b">
            <div className="col-span-5">Item</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-2 text-right">Rate</div>
            <div className="col-span-3 text-right">Amount</div>
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
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax (8.25%)</span>
            <span className="font-semibold">${tax.toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">${total.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="mt-4 rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground">
          <p className="font-medium mb-1">Payment Terms</p>
          <p>Net 30 days. Late payments subject to 1.5% monthly interest.</p>
        </div>
      </CardContent>
    </Card>
  )
}
