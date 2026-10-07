'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Upload,
  Loader2,
  Trash2,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Check,
  X,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Info,
} from 'lucide-react';
import { ProductOption, ProductSku } from '@/types';
import { parseCleanNumber, formatImageUrl, uploadImageFile } from '@/lib/api';

export interface VariationOptionValue {
  id: string;
  name: string;
  image?: string;
  hex?: string;
}

export interface VariationTier {
  id: string;
  name: string;
  values: VariationOptionValue[];
}

export interface MatrixRowCombination {
  tierId: string;
  tierName: string;
  valueId: string;
  valueName: string;
  hex?: string;
  image?: string;
}

export interface MatrixRow {
  key: string;
  combinations: MatrixRowCombination[];
  sku?: string;
  stock_type?: 'ready-stock' | 'pre-order';
  price: number | string;
  stock: number | string;
  image?: string;
}

export interface VariantBuilderOutput {
  variant_label: string;
  options: ProductOption[];
  skus: ProductSku[];
  stock_type?: 'ready-stock' | 'pre-order';
  lead_time_min?: number;
  lead_time_max?: number;
  variants: Array<{
    variant_name: string;
    sku?: string;
    variant_description?: string;
    variant_price: number | string;
    variant_qty: number | string;
    image_urls: string[];
  }>;
}

// Backward-compatibility aliases
export type ShopeeBuilderOutput = VariantBuilderOutput;
export type ShopeeTier = VariationTier;
export type ShopeeTierValue = VariationOptionValue;
export type ShopeeMatrixRow = MatrixRow;

interface VariantBuilderProps {
  initialPrice?: number | string;
  initialStock?: number | string;
  onChange: (output: VariantBuilderOutput) => void;
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}


/**
 * Computes dynamic Cartesian Product of all active tiers (1, 2, 3, ... N tiers)
 */
function computeCartesianProduct(tiers: VariationTier[]): MatrixRowCombination[][] {
  const activeTiers = tiers.filter((t) => t.values.length > 0);
  if (activeTiers.length === 0) return [];

  let result: MatrixRowCombination[][] = [[]];

  for (const tier of activeTiers) {
    const nextResult: MatrixRowCombination[][] = [];
    for (const prefix of result) {
      for (const val of tier.values) {
        nextResult.push([
          ...prefix,
          {
            tierId: tier.id,
            tierName: tier.name,
            valueId: val.id,
            valueName: val.name,
            hex: val.hex,
            image: val.image,
          },
        ]);
      }
    }
    result = nextResult;
  }

  return result;
}

export function VariantBuilder({
  initialPrice = '',
  initialStock = '',
  onChange,
}: VariantBuilderProps) {
  // Toggle multiple variations on/off
  const [hasVariants, setHasVariants] = useState<boolean>(true);

  // Single product state (when hasVariants is false)
  const [singlePrice, setSinglePrice] = useState<number | string>(initialPrice);
  const [singleStock, setSingleStock] = useState<number | string>(initialStock);
  const [singleSku, setSingleSku] = useState<string>('');
  const [singleStockType, setSingleStockType] = useState<'ready-stock' | 'pre-order'>('ready-stock');
  const [singleLeadTimeMin, setSingleLeadTimeMin] = useState<number | string>(10);
  const [singleLeadTimeMax, setSingleLeadTimeMax] = useState<number | string>(14);
  const [singleImages, setSingleImages] = useState<string[]>(['']);

  // Dynamic Tiers state (clean initial state: 1 empty tier, no example data)
  const [tiers, setTiers] = useState<VariationTier[]>([
    {
      id: 'tier_1',
      name: '',
      values: [],
    },
  ]);

  // Per-tier value text inputs
  const [tierInputs, setTierInputs] = useState<Record<string, string>>({});

  // Matrix combinations initialized clean (empty until options are added)
  const [matrix, setMatrix] = useState<MatrixRow[]>([]);

  // Bulk Apply Bar state
  const [bulkPrice, setBulkPrice] = useState<string | number>('');
  const [bulkStock, setBulkStock] = useState<string | number>('');
  const [bulkStockType, setBulkStockType] = useState<'ready-stock' | 'pre-order' | ''>('');
  const [bulkSkuPrefix, setBulkSkuPrefix] = useState<string>('');
  const [bulkImage, setBulkImage] = useState<string>('');
  const [bulkFeedback, setBulkFeedback] = useState(false);

  // Wasabi image uploading states
  const [isUploadingSingle, setIsUploadingSingle] = useState(false);
  const [isUploadingBulk, setIsUploadingBulk] = useState(false);
  const [uploadingRowKey, setUploadingRowKey] = useState<string | null>(null);
  const [uploadingTierValKey, setUploadingTierValKey] = useState<string | null>(null);

  // Stable ref for onChange to break dependency cycles with parent
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const lastOutputJsonRef = useRef<string>('');

  // Synchronize matrix when dynamic tiers change
  useEffect(() => {
    if (!hasVariants) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMatrix([]);
      return;
    }

    const combinations = computeCartesianProduct(tiers);

    setMatrix((prevMatrix) => {
      const prevMap = new Map<string, MatrixRow>();
      prevMatrix.forEach((row) => prevMap.set(row.key, row));

      return combinations.map((combo) => {
        const key = combo.map((c) => c.valueId).join('__');
        const existing = prevMap.get(key);

        // Fallback image from first tier with an image (e.g. color image)
        const tierImage = combo.find((c) => c.image && c.image.trim() !== '')?.image;

        const autoSku = combo.map((c) => slugify(c.valueName).toUpperCase()).join('-');
        return {
          key,
          combinations: combo,
          sku: existing?.sku !== undefined ? existing.sku : autoSku,
          stock_type: existing?.stock_type || 'ready-stock',
          price: existing !== undefined ? existing.price : initialPrice,
          stock: existing !== undefined ? existing.stock : initialStock,
          image: existing?.image || tierImage || '',
        };
      });
    });
  }, [tiers, hasVariants, initialPrice, initialStock]);

  // Emit data to parent whenever matrix, tiers, or single product state change
  useEffect(() => {
    let output: VariantBuilderOutput;

    // Mode 1: Single Product (no multi-variants)
    if (!hasVariants) {
      output = {
        variant_label: '',
        options: [],
        skus: [
          {
            id: singleSku.trim() || 'sku_1',
            sku: singleSku.trim() || undefined,
            stock_type: singleStockType,
            options: {},
            price_base: Number(singlePrice) || 0,
            stock: Number(singleStock) || 0,
            image: singleImages[0] || undefined,
          },
        ],
        variants: [
          {
            variant_name: 'Regular',
            sku: singleSku.trim() || undefined,
            variant_description: '',
            variant_price: Number(singlePrice) || 0,
            variant_qty: Number(singleStock) || 0,
            image_urls: singleImages.filter((img) => img.trim().length > 0),
          },
        ],
      };
    } else {
      // Mode 2: Multi-variant with 0 valid combinations
      const activeTiers = tiers.filter((t) => t.values.length > 0);
      if (activeTiers.length === 0 || matrix.length === 0) {
        output = {
          variant_label: '',
          options: [],
          skus: [],
          variants: [],
        };
      } else {
        // Generate options schema
        const options: ProductOption[] = activeTiers.map((tier) => {
          const tierSlug = slugify(tier.name) || tier.id;
          const isColorType =
            tier.name.toLowerCase().includes('warna') ||
            tier.name.toLowerCase().includes('color');
          const isSizeType =
            tier.name.toLowerCase().includes('ukuran') ||
            tier.name.toLowerCase().includes('size');

          return {
            id: tierSlug,
            name: tier.name,
            type: isColorType ? 'color' : isSizeType ? 'size' : 'text',
            values: tier.values.map((v, idx) => ({
              id: v.id,
              name: v.name,
              hex: v.hex,
              image: v.image,
              image_index: idx,
            })),
          };
        });

        // Generate SKUs schema
        const skus: ProductSku[] = matrix.map((row, idx) => {
          const optMap: Record<string, string> = {};
          row.combinations.forEach((c) => {
            const tSlug = slugify(c.tierName) || c.tierId;
            optMap[tSlug] = c.valueId;
          });

          return {
            id: row.sku?.trim() || `sku_${idx + 1}`,
            sku: row.sku?.trim() || undefined,
            stock_type: row.stock_type || 'ready-stock',
            options: optMap,
            price_base: Number(row.price) || 0,
            stock: Number(row.stock) || 0,
            image: row.image || undefined,
          };
        });

        // Find if any custom image exists in rows or tiers, or use default product placeholder
        const anyCustomImage =
          matrix.find((r) => r.image && r.image.trim() !== '')?.image ||
          activeTiers.flatMap((t) => t.values).find((v) => v.image && v.image.trim() !== '')?.image ||
          'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80';

        // Generate variants array for backend (guarantee at least 1 image per variant)
        const variants = matrix.map((row) => ({
          variant_name: row.combinations.map((c) => c.valueName).join(' - '),
          variant_description: '',
          variant_price: Number(row.price) || 0,
          variant_qty: Number(row.stock) || 0,
          image_urls: [row.image && row.image.trim() !== '' ? row.image.trim() : anyCustomImage],
        }));

        const variantLabel = activeTiers.map((t) => t.name).join(' × ');

        output = {
          variant_label: variantLabel,
          options,
          skus,
          variants,
        };
      }
    }

    const jsonStr = JSON.stringify(output);
    if (lastOutputJsonRef.current !== jsonStr) {
      lastOutputJsonRef.current = jsonStr;
      onChangeRef.current(output);
    }
  }, [hasVariants, matrix, tiers, singlePrice, singleStock, singleImages, singleSku, singleStockType, singleLeadTimeMin, singleLeadTimeMax]);

  // ─── Dynamic Tier Handlers ──────────────────────────────────────────────────

  const handleAddTier = (customName?: string) => {
    const tierNum = tiers.length + 1;
    const name = customName ?? '';
    const id = `tier_${Date.now()}_${tierNum}`;

    setTiers((prev) => [
      ...prev,
      {
        id,
        name,
        values: [],
      },
    ]);
  };

  const handleRemoveTier = (tierId: string) => {
    setTiers((prev) => prev.filter((t) => t.id !== tierId));
  };

  const handleUpdateTierName = (tierId: string, newName: string) => {
    setTiers((prev) =>
      prev.map((t) => (t.id === tierId ? { ...t, name: newName } : t))
    );
  };

  const handleAddTierValue = (tierId: string, valName?: string, hex?: string) => {
    const raw = (valName ?? tierInputs[tierId] ?? '').trim();
    if (!raw) return;

    const id = slugify(raw) || `opt_${Date.now()}`;

    setTiers((prev) =>
      prev.map((t) => {
        if (t.id !== tierId) return t;
        if (t.values.some((v) => v.id === id || v.name.toLowerCase() === raw.toLowerCase())) {
          return t;
        }
        return {
          ...t,
          values: [...t.values, { id, name: raw, hex }],
        };
      })
    );

    setTierInputs((prev) => ({ ...prev, [tierId]: '' }));
  };

  const handleRemoveTierValue = (tierId: string, valId: string) => {
    setTiers((prev) =>
      prev.map((t) =>
        t.id === tierId
          ? { ...t, values: t.values.filter((v) => v.id !== valId) }
          : t
      )
    );
  };

  const handleUpdateTierValueImage = (
    tierId: string,
    valId: string,
    image: string
  ) => {
    setTiers((prev) =>
      prev.map((t) =>
        t.id === tierId
          ? {
              ...t,
              values: t.values.map((v) => (v.id === valId ? { ...v, image } : v)),
            }
          : t
      )
    );

    // Propagate to matrix rows that contain this tier value if row doesn't have custom image yet
    setMatrix((prev) =>
      prev.map((row) => {
        const hasThisVal = row.combinations.some(
          (c) => c.tierId === tierId && c.valueId === valId
        );
        if (hasThisVal && (!row.image || row.image.trim() === '')) {
          return { ...row, image };
        }
        return row;
      })
    );
  };


  // ─── Wasabi Image Upload Handlers ──────────────────────────────────────────

  const handleUploadSingleImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingSingle(true);
    const newUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const res = await uploadImageFile(file);
      if (res.success && res.url) {
        newUrls.push(res.url);
      } else {
        alert(res.message || 'Gagal mengupload gambar ke Wasabi');
      }
    }

    if (newUrls.length > 0) {
      setSingleImages((prev) => {
        const cleaned = prev.filter((u) => u && u.trim().length > 0);
        return [...cleaned, ...newUrls];
      });
    }

    setIsUploadingSingle(false);
    e.target.value = '';
  };

  const handleUploadBulkImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBulk(true);
    const res = await uploadImageFile(file);
    if (res.success && res.url) {
      setBulkImage(res.url);
    } else {
      alert(res.message || 'Gagal mengupload gambar massal ke Wasabi');
    }
    setIsUploadingBulk(false);
    e.target.value = '';
  };

  const handleUploadRowImage = async (
    rowKey: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingRowKey(rowKey);
    const res = await uploadImageFile(file);
    if (res.success && res.url) {
      handleUpdateMatrixRow(rowKey, 'image', res.url);
    } else {
      alert(res.message || 'Gagal mengupload gambar variasi ke Wasabi');
    }
    setUploadingRowKey(null);
    e.target.value = '';
  };

  const handleUploadTierOptionImage = async (
    tierId: string,
    valId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingTierValKey(`${tierId}_${valId}`);
    const res = await uploadImageFile(file);
    if (res.success && res.url) {
      handleUpdateTierValueImage(tierId, valId, res.url);
    } else {
      alert(res.message || 'Gagal mengupload gambar opsi ke Wasabi');
    }
    setUploadingTierValKey(null);
    e.target.value = '';
  };

  // ─── Bulk Apply ─────────────────────────────────────────────────────────────

  const handleBulkApply = () => {
    setMatrix((prev) =>
      prev.map((r) => {
        const autoSuffix = r.combinations.map((c) => slugify(c.valueName).toUpperCase()).join('-');
        const computedSku =
          bulkSkuPrefix.trim() !== ''
            ? `${bulkSkuPrefix.trim()}-${autoSuffix}`
            : r.sku;

        return {
          ...r,
          price: bulkPrice !== '' ? parseCleanNumber(bulkPrice) : r.price,
          stock: bulkStock !== '' ? parseCleanNumber(bulkStock) : r.stock,
          stock_type: bulkStockType !== '' ? bulkStockType : (r.stock_type || 'ready-stock'),
          sku: computedSku,
          image: bulkImage.trim() !== '' ? bulkImage.trim() : r.image,
        };
      })
    );
    setBulkFeedback(true);
    setTimeout(() => setBulkFeedback(false), 2000);
  };

  // ─── Individual Matrix Row Update ──────────────────────────────────────────

  const handleUpdateMatrixRow = (
    key: string,
    field: 'price' | 'stock' | 'image',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any
  ) => {
    setMatrix((prev) =>
      prev.map((row) => (row.key === key ? { ...row, [field]: value } : row))
    );
  };

  // ─── Single Product Helpers ────────────────────────────────────────────────



  const handleRemoveSingleImage = (index: number) => {
    setSingleImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          VARIATION MODE TOGGLE: TUNGGAL vs MULTI-VARIAN DINAMIS
         ───────────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Sistem Multi-Variasi Produk
            </h4>
            <p className="text-[11px] text-zinc-400">
              {hasVariants
                ? 'Aktif — Anda dapat menambahkan beberapa tingkatan varian secara dinamis (Warna, Ukuran, dll).'
                : 'Non-aktif — Produk ini merupakan produk varian tunggal (1 harga & stok tetap).'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setHasVariants(!hasVariants)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border shrink-0 ${
            hasVariants
              ? 'bg-gradient-to-r from-pink-500/20 to-rose-500/20 border-pink-500/40 text-pink-300 hover:bg-pink-500/30'
              : 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:text-white'
          }`}
        >
          {hasVariants ? (
            <>
              <ToggleRight className="w-5 h-5 text-pink-400" />
              <span>Multi-Varian Aktif</span>
            </>
          ) : (
            <>
              <ToggleLeft className="w-5 h-5 text-zinc-500" />
              <span>Gunakan Multi-Varian</span>
            </>
          )}
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODE A: PRODUK TUNGGAL (JIKA VARIAN DINONAKTIFKAN)
         ───────────────────────────────────────────────────────────── */}
      {!hasVariants && (
        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4">
          <div className="flex items-center gap-2 text-zinc-300">
            <Info className="w-4 h-4 text-pink-400" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Pengaturan Produk Varian Tunggal
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                Kode SKU <span className="text-zinc-500">(Opsional)</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: NVM-RDY-001"
                value={singleSku}
                onChange={(e) => setSingleSku(e.target.value.toUpperCase())}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                Harga Jual (Rp) <span className="text-pink-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="0"
                  value={singlePrice}
                  onChange={(e) => setSinglePrice(parseCleanNumber(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white font-semibold focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                Stok Produk (pcs) <span className="text-pink-400">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                placeholder="0"
                value={singleStock}
                onChange={(e) => setSingleStock(parseCleanNumber(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white font-semibold focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          {/* Tipe Ketersediaan Stok Single Product */}
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2.5">
            <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
              Tipe Ketersediaan Stok
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <label className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                singleStockType === 'ready-stock'
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 shadow-sm'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}>
                <input
                  type="radio"
                  name="singleStockType"
                  value="ready-stock"
                  checked={singleStockType === 'ready-stock'}
                  onChange={() => setSingleStockType('ready-stock')}
                  className="hidden"
                />
                <span>📦 Ready Stock (Siap Kirim)</span>
              </label>

              <label className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                singleStockType === 'pre-order'
                  ? 'bg-purple-500/10 border-purple-500/50 text-purple-300 shadow-sm'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}>
                <input
                  type="radio"
                  name="singleStockType"
                  value="pre-order"
                  checked={singleStockType === 'pre-order'}
                  onChange={() => setSingleStockType('pre-order')}
                  className="hidden"
                />
                <span>✈️ Pre-Order (PO Impor)</span>
              </label>

              {singleStockType === 'pre-order' && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800">
                  <span className="text-purple-400 font-semibold text-[11px]">Estimasi PO:</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="10"
                    value={singleLeadTimeMin}
                    onChange={(e) => setSingleLeadTimeMin(e.target.value)}
                    className="w-12 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-center text-white text-xs font-bold"
                  />
                  <span>-</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="14"
                    value={singleLeadTimeMax}
                    onChange={(e) => setSingleLeadTimeMax(e.target.value)}
                    className="w-12 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-center text-white text-xs font-bold"
                  />
                  <span>hari kerja</span>
                </div>
              )}
            </div>
          </div>

          {/* Single Product Images (Direct Wasabi Upload) */}
          <div className="space-y-3 pt-2 border-t border-zinc-800/80">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                  Foto Produk ({singleImages.filter((u) => u && u.trim().length > 0).length} Foto Tersimpan)
                </label>
                <p className="text-[10px] text-zinc-500">
                  Foto langsung disimpan ke Wasabi Cloud Storage.
                </p>
              </div>

              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/30 text-xs font-semibold transition cursor-pointer">
                {isUploadingSingle ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Mengunggah...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    + Upload Foto ke Wasabi
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={isUploadingSingle}
                  onChange={handleUploadSingleImages}
                  className="hidden"
                />
              </label>
            </div>

            {/* List of uploaded single product photos */}
            {singleImages.filter((u) => u && u.trim().length > 0).length === 0 ? (
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-800 hover:border-pink-500/50 rounded-2xl bg-zinc-950/60 hover:bg-zinc-900/50 cursor-pointer transition text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-400">
                  {isUploadingSingle ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-300">
                    {isUploadingSingle ? 'Sedang mengunggah foto ke Wasabi...' : 'Klik untuk Pilih & Upload Foto Produk'}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    Mendukung JPG, PNG, WEBP (otomatis dikompres & disimpan ke Wasabi)
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={isUploadingSingle}
                  onChange={handleUploadSingleImages}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {singleImages
                  .filter((u) => u && u.trim().length > 0)
                  .map((imgUrl, imgIdx) => (
                    <div
                      key={imgIdx}
                      className="group relative rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-sm"
                    >
                      <div className="aspect-square w-full overflow-hidden bg-zinc-900">
                        <img
                          src={formatImageUrl(imgUrl)}
                          alt={`Foto Produk ${imgIdx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                      <div className="p-2 flex items-center justify-between bg-zinc-900/90 border-t border-zinc-800/80">
                        <span className="text-[10px] font-medium text-emerald-400 flex items-center gap-1">
                          ☁️ Wasabi
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSingleImage(imgIdx)}
                          className="p-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition cursor-pointer"
                          title="Hapus foto ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODE B: MULTI-VARIAN DINAMIS (TIERS BERTINGKAT)
         ───────────────────────────────────────────────────────────── */}
      {hasVariants && (
        <>
          {/* List of Dynamic Tiers */}
          <div className="space-y-4">
            {tiers.length === 0 ? (
              <div className="p-6 rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 text-center space-y-2">
                <p className="text-xs text-zinc-400 font-medium">
                  Belum ada tingkat variasi yang dibuat.
                </p>
                <p className="text-[11px] text-zinc-500">
                  Klik tombol &quot;+ Tambah Tingkat Variasi Baru&quot; di bawah untuk membuat tingkat variasi (seperti Warna, Ukuran, dll).
                </p>
              </div>
            ) : (
              tiers.map((tier, tierIdx) => {
                
                

                return (
                  <div
                    key={tier.id}
                    className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-[10px] font-bold">
                          {tierIdx + 1}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                          Variasi Tingkat {tierIdx + 1}{tier.name ? `: ${tier.name}` : ''}
                        </span>
                        <span className="text-[11px] text-zinc-500 hidden sm:inline">
                          ({tier.values.length} Opsi)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Delete Tier Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveTier(tier.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition cursor-pointer flex items-center gap-1"
                          title="Hapus tingkat variasi ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Hapus Tingkat</span>
                        </button>
                      </div>
                    </div>

                    {/* Tier Name & Value Adder */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-1">
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                          Nama Variasi <span className="text-pink-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Warna, Ukuran, Bahan"
                          value={tier.name}
                          onChange={(e) => handleUpdateTierName(tier.id, e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                          Tambah Pilihan Opsi ({tier.name || `Tingkat ${tierIdx + 1}`})
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder={
                              tier.name
                                ? `Ketik opsi ${tier.name.toLowerCase()} lalu tekan Enter...`
                                : 'Ketik opsi varian lalu tekan Enter...'
                            }
                            value={tierInputs[tier.id] || ''}
                            onChange={(e) =>
                              setTierInputs({ ...tierInputs, [tier.id]: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTierValue(tier.id);
                              }
                            }}
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddTierValue(tier.id)}
                            className="px-3.5 py-2 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/30 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Tambah
                          </button>
                        </div>
                      </div>
                    </div>


                    {/* Active Values List */}
                    <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                        Daftar Opsi {tier.name || `Tingkat ${tierIdx + 1}`} ({tier.values.length} Opsi):
                      </span>

                      {tier.values.length === 0 ? (
                        <p className="text-xs text-amber-400/80 italic py-1">
                          ⚠️ Belum ada opsi untuk {tier.name || `variasi tingkat ${tierIdx + 1}`}. Tambahkan minimal 1 opsi di atas.
                        </p>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          {tier.values.map((val) => (
                            <div
                              key={val.id}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-200 shadow-sm"
                            >
                              {val.hex && (
                                <span
                                  className="w-3 h-3 rounded-full border border-white/20 inline-block"
                                  style={{ backgroundColor: val.hex }}
                                />
                              )}
                              <span>{val.name}</span>

                              {/* Option image thumbnail if present */}
                              {val.image ? (
                                <div className="w-4 h-4 rounded overflow-hidden">
                                  <img
                                    src={formatImageUrl(val.image)}
                                    alt={val.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <label
                                  className="text-zinc-500 hover:text-pink-400 p-0.5 rounded cursor-pointer transition"
                                  title="Upload foto khusus opsi ini ke Wasabi"
                                >
                                  {uploadingTierValKey === `${tier.id}_${val.id}` ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-pink-400" />
                                  ) : (
                                    <Upload className="w-3 h-3" />
                                  )}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    disabled={uploadingTierValKey === `${tier.id}_${val.id}`}
                                    onChange={(e) => handleUploadTierOptionImage(tier.id, val.id, e)}
                                    className="hidden"
                                  />
                                </label>
                              )}

                              <button
                                type="button"
                                onClick={() => handleRemoveTierValue(tier.id, val.id)}
                                className="text-zinc-500 hover:text-rose-400 p-0.5 rounded cursor-pointer ml-1"
                                title="Hapus opsi"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Add Another Tier Button */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800">
            <span className="text-xs text-zinc-400">
              Butuh tingkatan variasi tambahan (misal: Bahan, Model, Ukuran)?
            </span>
            <button
              type="button"
              onClick={() => handleAddTier()}
              className="px-4 py-2 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Tambah Tingkat Variasi Baru
            </button>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              PENERAPAN SEKALIGUS (BULK APPLY / MASS APPLY)
             ───────────────────────────────────────────────────────────── */}
          {matrix.length > 0 && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-950/30 via-zinc-900 to-purple-950/30 border border-pink-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    Penerapan Sekaligus (Mass Apply)
                  </span>
                  <span className="text-[11px] text-zinc-400 hidden sm:inline">
                    Isi harga & stok ke semua {matrix.length} kombinasi dalam 1 klik
                  </span>
                </div>
                {bulkFeedback && (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 animate-pulse">
                    <Check className="w-3.5 h-3.5" /> Berhasil Diterapkan!
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                    Harga Semua (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={bulkPrice}
                      onChange={(e) => setBulkPrice(parseCleanNumber(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div className="w-24">
                  <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                    Stok Semua
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={bulkStock}
                    onChange={(e) => setBulkStock(parseCleanNumber(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div className="w-36">
                  <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                    Tipe Stok Semua
                  </label>
                  <select
                    value={bulkStockType}
                    onChange={(e) => setBulkStockType(e.target.value as 'ready-stock' | 'pre-order' | '')}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-pink-500"
                  >
                    <option value="">(Pertahankan)</option>
                    <option value="ready-stock">📦 Ready Stock</option>
                    <option value="pre-order">✈️ Pre-Order</option>
                  </select>
                </div>

                <div className="w-32">
                  <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                    Prefix SKU
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: NVM"
                    value={bulkSkuPrefix}
                    onChange={(e) => setBulkSkuPrefix(e.target.value.toUpperCase())}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono uppercase focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div className="flex-1 min-w-[170px]">
                  <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                    Foto Semua Variasi (Wasabi)
                  </label>
                  {bulkImage ? (
                    <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-1 pr-2">
                      <div className="w-7 h-7 rounded-lg overflow-hidden bg-zinc-900 shrink-0 border border-zinc-800">
                        <img
                          src={formatImageUrl(bulkImage)}
                          alt="Bulk"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-[10px] text-emerald-400 font-semibold truncate flex-1">
                        ☁️ Foto Terpasang
                      </span>
                      <button
                        type="button"
                        onClick={() => setBulkImage('')}
                        className="text-zinc-500 hover:text-rose-400 p-0.5 rounded cursor-pointer"
                        title="Hapus foto massal"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-1.5 w-full bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-pink-500/50 rounded-xl px-3 py-1.5 text-xs text-zinc-300 hover:text-white cursor-pointer transition">
                      {isUploadingBulk ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-400" />
                          <span className="text-[11px] text-pink-300">Mengunggah...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-pink-400" />
                          <span className="text-[11px]">Upload Foto Massal</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingBulk}
                        onChange={handleUploadBulkImage}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div className="self-end">
                  <button
                    type="button"
                    onClick={handleBulkApply}
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-pink-500/20 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Terapkan ke Semua ({matrix.length})
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TABEL KOMBINASI MATRIX DINAMIS (1, 2, 3.. N TIERS)
             ───────────────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-pink-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  Daftar Kombinasi Variasi ({matrix.length} Kombinasi)
                </h4>
              </div>
              <span className="text-[11px] text-zinc-500">
                {tiers
                  .filter((t) => t.values.length > 0)
                  .map((t) => t.name || 'Varian')
                  .join(' × ')}
              </span>
            </div>

            {matrix.length === 0 ? (
              <div className="p-8 rounded-2xl bg-zinc-900/50 border border-dashed border-zinc-800 text-center space-y-2">
                <Layers className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-xs text-zinc-400 font-medium">
                  Belum ada kombinasi varian.
                </p>
                <p className="text-[11px] text-zinc-500">
                  Tambahkan opsi pada tingkat variasi di atas untuk membentuk daftar varian produk.
                </p>
              </div>
            ) : (
              <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-900/90 text-zinc-400 font-semibold border-b border-zinc-800 text-[11px] uppercase tracking-wider">
                      <tr>
                        {/* Dynamic Column Headers for each active tier */}
                        {tiers
                          .filter((t) => t.values.length > 0)
                          .map((tier) => (
                            <th
                              key={tier.id}
                              className="px-4 py-3 min-w-[110px]"
                            >
                              {tier.name || 'Varian'}
                            </th>
                          ))}
                        <th className="px-4 py-3 min-w-[160px]">Harga Jual (Rp) *</th>
                        <th className="px-4 py-3 min-w-[110px]">Stok *</th>
                        <th className="px-4 py-3 min-w-[220px]">Foto Varian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/80">
                      {matrix.map((row) => (
                        <tr
                          key={row.key}
                          className="hover:bg-zinc-900/40 transition-colors"
                        >
                          {/* Dynamic Tier Value Badges */}
                          {row.combinations.map((c, cIdx) => (
                            <td key={cIdx} className="px-4 py-3 font-semibold text-zinc-200">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${
                                  cIdx === 0
                                    ? 'bg-zinc-900 border-zinc-800 text-zinc-200'
                                    : cIdx === 1
                                    ? 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                                }`}
                              >
                                {c.hex && (
                                  <span
                                    className="w-2.5 h-2.5 rounded-full border border-white/20 inline-block"
                                    style={{ backgroundColor: c.hex }}
                                  />
                                )}
                                {c.valueName}
                              </span>
                            </td>
                          ))}

                          {/* Price input */}
                          <td className="px-4 py-3">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-zinc-500">
                                Rp
                              </span>
                              <input
                                type="text"
                                inputMode="numeric"
                                required
                                placeholder="0"
                                value={row.price}
                                onChange={(e) =>
                                  handleUpdateMatrixRow(
                                    row.key,
                                    'price',
                                    parseCleanNumber(e.target.value)
                                  )
                                }
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-zinc-100 font-semibold focus:outline-none focus:border-pink-500"
                              />
                            </div>
                          </td>

                          {/* Stock input */}
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              inputMode="numeric"
                              required
                              placeholder="0"
                              value={row.stock}
                              onChange={(e) =>
                                handleUpdateMatrixRow(
                                  row.key,
                                  'stock',
                                  parseCleanNumber(e.target.value)
                                )
                              }
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 font-semibold focus:outline-none focus:border-pink-500"
                            />
                          </td>

                          {/* Combination Photo (Wasabi Upload) */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {row.image ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
                                    <img
                                      src={formatImageUrl(row.image)}
                                      alt={row.key}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <label
                                      className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-[10px] font-medium transition cursor-pointer flex items-center gap-1"
                                      title="Ganti foto ini di Wasabi"
                                    >
                                      {uploadingRowKey === row.key ? (
                                        <Loader2 className="w-3 h-3 animate-spin text-pink-400" />
                                      ) : (
                                        <Upload className="w-3 h-3 text-pink-400" />
                                      )}
                                      <span>Ganti</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        disabled={uploadingRowKey === row.key}
                                        onChange={(e) => handleUploadRowImage(row.key, e)}
                                        className="hidden"
                                      />
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateMatrixRow(row.key, 'image', '')}
                                      className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 transition cursor-pointer"
                                      title="Hapus foto"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-pink-500/40 text-xs font-semibold transition cursor-pointer">
                                  {uploadingRowKey === row.key ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin text-pink-400" />
                                      <span className="text-[11px] text-pink-300">Mengunggah...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-3 h-3 text-pink-400" />
                                      <span className="text-[11px]">Upload Foto</span>
                                    </>
                                  )}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    disabled={uploadingRowKey === row.key}
                                    onChange={(e) => handleUploadRowImage(row.key, e)}
                                    className="hidden"
                                  />
                                </label>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-zinc-900/60 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Total {matrix.length} variasi kombinasi siap disimpan ke backend.
                  </span>
                  <span className="text-zinc-500">
                    Stok kumulatif:{' '}
                    <strong className="text-zinc-300">
                      {matrix.reduce((acc, curr) => acc + (Number(curr.stock) || 0), 0)} pcs
                    </strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
