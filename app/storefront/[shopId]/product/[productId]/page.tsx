'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingCart, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { API_BASE_URL } from '../../../../api-config';

interface Product {
  id: number;
  name_en: string;
  name_ar: string;
  brand?: string;
  sell_price: number;
  stock_quantity?: number;
  available_stock?: number;
  image_url?: string;
  description_short?: string;
  description_long?: string;
  specs_json?: string;
  warranty_text?: string;
  return_policy_text?: string;
  gallery_urls_json?: string;
  category_name_en?: string;
  category_name_ar?: string;
}

interface Shop {
  id: number;
  name: string;
}

export default function StorefrontProductPage() {
  const params = useParams();
  const router = useRouter();
  const shopId = Array.isArray(params.shopId) ? params.shopId[0] : params.shopId;
  const productId = Array.isArray(params.productId) ? params.productId[0] : params.productId;
  const [data, setData] = useState<{ shop: Shop; product: Product } | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [quantity, setQuantity] = useState(1);
  const [expandedSection, setExpandedSection] = useState<string | null>('description');

  useEffect(() => {
    if (shopId && productId) {
      fetch(`${API_BASE_URL}/public/storefront/${shopId}/product/${productId}`)
        .then((r) => r.ok ? r.json() : null)
        .then(setData)
        .catch(() => setData(null))
        .finally(() => setLoading(false));
    }
  }, [shopId, productId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-cyan-400 text-xl">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">{language === 'ar' ? 'المنتج غير موجود' : 'Product not found'}</h1>
          <Link href={`/storefront/${shopId}`} className="text-cyan-400 hover:text-cyan-300">
            {language === 'ar' ? 'العودة للمتجر' : 'Back to store'}
          </Link>
        </div>
      </div>
    );
  }

  const { shop, product } = data;
  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const name = language === 'ar' ? product.name_ar : product.name_en;
  const available = Number(product.available_stock ?? product.stock_quantity ?? 0);
  let gallery: string[] = [];
  try {
    if (product.gallery_urls_json) gallery = Array.isArray(JSON.parse(product.gallery_urls_json)) ? JSON.parse(product.gallery_urls_json) : [];
  } catch {}
  const images = [product.image_url, ...gallery].filter(Boolean) as string[];
  if (images.length === 0) images.push('');
  let specs: { key?: string; value?: string }[] = [];
  try {
    if (product.specs_json) specs = Array.isArray(JSON.parse(product.specs_json)) ? JSON.parse(product.specs_json) : [];
  } catch {}

  const toggleSection = (id: string) => {
    setExpandedSection((s) => (s === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-black text-white" dir={dir}>
      <header className="bg-gray-900 border-b border-cyan-500 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/storefront/${shopId}`}
              className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
            >
              {language === 'ar' ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              {language === 'ar' ? 'العودة' : 'Back'}
            </Link>
            <h1 className="text-xl font-bold neon-text">CROWN</h1>
          </div>
          <button
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition"
          >
            {language === 'en' ? 'AR' : 'EN'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Gallery */}
          <div className="space-y-4">
            <div className="aspect-square rounded-xl border border-cyan-500/30 bg-gray-900 overflow-hidden flex items-center justify-center">
              {images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={images[0]} alt={name} className="w-full h-full object-contain" />
              ) : (
                <div className="text-slate-500 text-4xl">📦</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.slice(1).map((url, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-20 h-20 rounded-lg border border-cyan-500/20 overflow-hidden bg-gray-800"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            {product.category_name_en && (
              <p className="text-xs text-purple-400 uppercase mb-2">
                {language === 'ar' ? product.category_name_ar : product.category_name_en}
              </p>
            )}
            <h1 className="text-3xl font-bold text-white mb-2">{name}</h1>
            {product.brand && <p className="text-slate-400 mb-4">{product.brand}</p>}
            <p className="text-4xl font-bold text-cyan-400 mb-6">
              {product.sell_price.toFixed(2)} {language === 'ar' ? 'ج.م' : 'EGP'}
            </p>
            <p className="text-sm text-slate-400 mb-4">
              {language === 'ar' ? 'المتوفر:' : 'In stock:'} {available}
            </p>

            <div className="flex flex-wrap items-center gap-4 mb-8">
              <div className="flex items-center border border-cyan-500/30 rounded-lg overflow-hidden">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700"
                >
                  −
                </button>
                <span className="px-4 py-2 min-w-[3rem] text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(available, q + 1))}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700"
                >
                  +
                </button>
              </div>
              <button
                disabled={available <= 0}
                className="px-6 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                {language === 'ar' ? 'أضف للسلة' : 'Add to cart'}
              </button>
              <button
                disabled={available <= 0}
                className="px-6 py-3 rounded-lg border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 font-semibold disabled:opacity-50"
              >
                {language === 'ar' ? 'اشتري الآن' : 'Buy now'}
              </button>
            </div>

            {/* Collapsible sections */}
            <div className="space-y-2 border-t border-cyan-500/20 pt-6">
              {(product.description_short || product.description_long) && (
                <div className="border border-cyan-500/20 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('description')}
                    className="w-full flex justify-between items-center px-4 py-3 text-left text-cyan-200 font-semibold hover:bg-cyan-500/5"
                  >
                    {language === 'ar' ? 'الوصف' : 'Description'}
                    {expandedSection === 'description' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  {expandedSection === 'description' && (
                    <div className="px-4 pb-4 text-slate-300 text-sm whitespace-pre-wrap">
                      {product.description_short && <p className="mb-2">{product.description_short}</p>}
                      {product.description_long && <p>{product.description_long}</p>}
                    </div>
                  )}
                </div>
              )}
              {specs.length > 0 && (
                <div className="border border-cyan-500/20 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('specs')}
                    className="w-full flex justify-between items-center px-4 py-3 text-left text-cyan-200 font-semibold hover:bg-cyan-500/5"
                  >
                    {language === 'ar' ? 'المواصفات' : 'Specs'}
                    {expandedSection === 'specs' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  {expandedSection === 'specs' && (
                    <div className="px-4 pb-4">
                      <table className="w-full text-sm text-slate-300">
                        <tbody>
                          {specs.map((s, i) => (
                            <tr key={i} className="border-b border-cyan-500/10">
                              <td className="py-2 text-cyan-300">{s.key || '—'}</td>
                              <td className="py-2 text-right">{s.value || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              {product.return_policy_text && (
                <div className="border border-cyan-500/20 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('return')}
                    className="w-full flex justify-between items-center px-4 py-3 text-left text-cyan-200 font-semibold hover:bg-cyan-500/5"
                  >
                    {language === 'ar' ? 'سياسة الإرجاع' : 'Return Policy'}
                    {expandedSection === 'return' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  {expandedSection === 'return' && (
                    <div className="px-4 pb-4 text-slate-300 text-sm whitespace-pre-wrap">{product.return_policy_text}</div>
                  )}
                </div>
              )}
              {product.warranty_text && (
                <div className="border border-cyan-500/20 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('warranty')}
                    className="w-full flex justify-between items-center px-4 py-3 text-left text-cyan-200 font-semibold hover:bg-cyan-500/5"
                  >
                    {language === 'ar' ? 'الضمان' : 'Warranty'}
                    {expandedSection === 'warranty' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  {expandedSection === 'warranty' && (
                    <div className="px-4 pb-4 text-slate-300 text-sm whitespace-pre-wrap">{product.warranty_text}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
