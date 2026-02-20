import React from 'react'
import { Check } from 'lucide-react'
import type { LoanProduct } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface LoanProductCardProps {
    product: LoanProduct
    onApply: (product: LoanProduct) => void
}

export const LoanProductCard: React.FC<LoanProductCardProps> = ({ product, onApply }) => {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col h-full group">
            {/* Top Image & Tag */}
            <div className="relative h-48 overflow-hidden">
                <img
                    src={product.image_url || `https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1073&auto=format&fit=crop`}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {product.tag && (
                    <div className="absolute top-4 right-4 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider shadow-lg">
                        {product.tag}
                    </div>
                )}
            </div>

            <div className="p-6 flex flex-col flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>

                <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-2xl font-bold text-primary">{product.interest_rate}%</span>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-tighter">APR</span>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                    {(product.features || [
                        `Up to ${formatCurrency(product.max_amount)}`,
                        'Fixed rate options',
                        'No processing fees',
                        'Expert guidance'
                    ]).map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                            <div className="w-4 h-4 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <Check size={10} className="text-primary" />
                            </div>
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>

                <button
                    onClick={() => onApply(product)}
                    className="w-full py-3 bg-[#0066CC] hover:bg-[#0052A3] text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
                >
                    Apply Now
                </button>
            </div>
        </div>
    )
}
