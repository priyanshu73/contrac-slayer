import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink, CheckCircle2 } from 'lucide-react'

export function ProductRecommendations() {
  const products = [
    {
      name: 'Premium Hardwood Mulch',
      store: 'Home Depot',
      sku: 'HD-MH-2CF',
      price: 4.98,
      unit: '2 cu. ft. bag',
      qty: 15,
      inStock: true,
      reason: 'Perfect for 500 sq ft coverage',
    },
    {
      name: 'EasyFlex No-Dig Edging',
      store: "Lowe's",
      sku: 'LW-EDG-20FT',
      price: 17.98,
      unit: '20 ft roll',
      qty: 4,
      inStock: true,
      reason: 'Durable plastic, 80ft needed',
    },
    {
      name: 'DeWalt Landscaping Kit',
      store: 'Home Depot',
      sku: 'HD-DW-KIT',
      price: 149.00,
      unit: 'kit',
      qty: 1,
      inStock: false,
      reason: 'Recommended for efficiency',
    },
  ]
  
  const totalCost = products.reduce((sum, p) => sum + (p.price * p.qty), 0)
  
  return (
    <Card className="shadow-xl border-2 hover:shadow-2xl transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold">AI Product Recommendations</h3>
          <Badge className="bg-chart-3/10 text-chart-3 border-chart-3/20">Smart Match</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          For: Backyard Landscaping Project (500 sq ft)
        </p>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {products.map((product, i) => (
          <div 
            key={i} 
            className="rounded-lg border bg-card p-3 hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm">{product.name}</h4>
                  {product.inStock && (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <span className="font-medium">{product.store}</span>
                  <span>•</span>
                  <span>{product.sku}</span>
                  {!product.inStock && (
                    <>
                      <span>•</span>
                      <Badge variant="outline" className="text-xs px-1.5 py-0">Out of Stock</Badge>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">${product.price}</p>
                <p className="text-xs text-muted-foreground">{product.unit}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  Qty: {product.qty}
                </Badge>
                <span className="text-xs text-muted-foreground">{product.reason}</span>
              </div>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                View
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
        
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold">Estimated Materials Total</span>
            <span className="text-xl font-bold text-primary">${totalCost.toFixed(2)}</span>
          </div>
          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            Add All to Cart
          </Button>
        </div>
        
        <div className="rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground">
          <p><span className="font-medium">💡 AI Tip:</span> Save $47 by purchasing in bulk at Home Depot this week</p>
        </div>
      </CardContent>
    </Card>
  )
}
