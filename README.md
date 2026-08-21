# siamsupply.sg

Trade wholesale site for **Siam Supply Co.**, the trading name of Jiratham Pte. Ltd.
(UEN 202433113G). Static, no build step, served by GitHub Pages from `main` at the
repository root.

## The page is generated, not hand-edited

The price list, the JSON-LD product catalogue and the product images are all written
into `index.html` by a script in the work tree, from `MASTER_COST_LIST.csv` as the
single source of truth:

```
01-shopee/WHOLESALE/photos/bin/export_site.py
```

It rewrites three regions, each fenced by markers. **Do not hand-edit inside them**,
the next export will overwrite it:

| Marker | Holds |
|---|---|
| `GENERATED-LIST` | the 11 brand listings and all 35 SKU rows |
| `GENERATED-LD` | the `WholesaleStore` JSON-LD block |
| `GENERATED` (in the script) | the `PRODUCTS` array the order builder reads |

Everything outside those markers, layout, copy and CSS, is hand-written and safe to edit.

To change a price, a MOQ or a product, edit the cost list and re-run the export.

## Notes

- `SHOW_PRICES` at the top of the script tag is `false`. Trade prices are in the page
  data but not printed, so the rate sheet stays off competitors' screens and enquiries
  route to WhatsApp. Flip it to `true` to publish per-piece pricing.
- Product cut-outs in `assets/cut/` are keyed PNGs exported to WebP. The keying leaves
  holes where a product is genuinely white, which is invisible on a light ground and
  obvious on a dark one, so **never place them on a saturated colour**.
- Fonts are self-hosted in `assets/fonts/`. No third-party requests.
