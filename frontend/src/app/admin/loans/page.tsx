'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, FileText, Clock, DollarSign } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { ImageUpload } from '@/components/ImageUpload'

export default function AdminLoansPage() {
    const [applications, setApplications] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'applications' | 'products'>('applications')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [newProduct, setNewProduct] = useState({
        name: '',
        type: 'personal',
        description: '',
        min_amount: '',
        max_amount: '',
        base_interest_rate: '',
        min_term_months: '',
        max_term_months: '',
        tag: 'New',
        image_url: '',
        features: ''
    })

    const fetchLoans = async () => {
        setLoading(true)
        try {
            const adminId = localStorage.getItem('admin_id')
            const appRes = await apiClient.get<any>('/admin/loans/applications', { params: { admin_id: adminId } })
            if (appRes.success) {
                setApplications(appRes.data)
            }

            const prodRes = await apiClient.get<any>('/api/v1/loans/products', { params: { user_tier: 'standard' } })
            if (prodRes.success) {
                setProducts(prodRes.data)
            }
        } catch (err) {
            logger.error('Failed to fetch admin loans', { error: err })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLoans()
    }, [])

    const handleCreateProduct = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            const adminId = localStorage.getItem('admin_id')
            const payload = {
                ...newProduct,
                min_amount: parseFloat(newProduct.min_amount),
                max_amount: parseFloat(newProduct.max_amount),
                base_interest_rate: parseFloat(newProduct.base_interest_rate),
                min_term_months: parseInt(newProduct.min_term_months),
                max_term_months: parseInt(newProduct.max_term_months),
                features: newProduct.features.split('\n').filter(f => f.trim() !== ''),
                admin_id: adminId
            }
            const res = await apiClient.post<any>('/admin/loans/products', payload)
            if (res.success) {
                toast.success('Loan product created successfully!')
                setShowCreateModal(false)
                setNewProduct({
                    name: '', type: 'personal', description: '', min_amount: '', max_amount: '',
                    base_interest_rate: '', min_term_months: '', max_term_months: '',
                    tag: 'New', image_url: '', features: ''
                })
            }
        } catch (err) {
            logger.error('Failed to create product', { error: err })
            toast.error('Failed to create loan product')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-8 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Loan Management</h1>
                    <p className="text-gray-500 mt-1">Review applications and manage loan products available to customers.</p>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="flex bg-gray-100 p-1 rounded-xl mr-4">
                        <button
                            onClick={() => setActiveTab('applications')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'applications' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Applications
                        </button>
                        <button
                            onClick={() => setActiveTab('products')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'products' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Products
                        </button>
                    </div>
                    <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                        <DialogTrigger asChild>
                            <Button className="font-bold rounded-xl shadow-lg shadow-blue-100 bg-primary text-white hover:scale-[1.02] active:scale-[0.98] transition-all">
                                Create Product
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px] rounded-3xl p-8 max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black">Create Loan Product</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreateProduct} className="space-y-6 mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Product Name</label>
                                        <Input value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="e.g. Gold Personal Loan" required className="rounded-xl h-12" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type</label>
                                        <Select value={newProduct.type} onValueChange={v => setNewProduct({ ...newProduct, type: v })}>
                                            <SelectTrigger className="rounded-xl h-12">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="personal">Personal</SelectItem>
                                                <SelectItem value="home">Home</SelectItem>
                                                <SelectItem value="auto">Auto</SelectItem>
                                                <SelectItem value="business">Business</SelectItem>
                                                <SelectItem value="education">Education</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Description</label>
                                    <Textarea value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} placeholder="Tell us about this product..." required className="rounded-xl min-h-[100px]" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Min Amount ($)</label>
                                        <Input type="number" value={newProduct.min_amount} onChange={e => setNewProduct({ ...newProduct, min_amount: e.target.value })} placeholder="1000" required className="rounded-xl h-12" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Max Amount ($)</label>
                                        <Input type="number" value={newProduct.max_amount} onChange={e => setNewProduct({ ...newProduct, max_amount: e.target.value })} placeholder="50000" required className="rounded-xl h-12" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Interest Rate (%)</label>
                                        <Input type="number" step="0.01" value={newProduct.base_interest_rate} onChange={e => setNewProduct({ ...newProduct, base_interest_rate: e.target.value })} placeholder="5.5" required className="rounded-xl h-12" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Min Term (Mo)</label>
                                        <Input type="number" value={newProduct.min_term_months} onChange={e => setNewProduct({ ...newProduct, min_term_months: e.target.value })} placeholder="12" required className="rounded-xl h-12" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Max Term (Mo)</label>
                                        <Input type="number" value={newProduct.max_term_months} onChange={e => setNewProduct({ ...newProduct, max_term_months: e.target.value })} placeholder="60" required className="rounded-xl h-12" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tag</label>
                                        <Input value={newProduct.tag} onChange={e => setNewProduct({ ...newProduct, tag: e.target.value })} placeholder="e.g. Popular" className="rounded-xl h-12" />
                                    </div>
                                    <ImageUpload
                                        value={newProduct.image_url}
                                        onChange={(val) => setNewProduct({ ...newProduct, image_url: val })}
                                        label="Product Image"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Features (One per line)</label>
                                    <Textarea value={newProduct.features} onChange={e => setNewProduct({ ...newProduct, features: e.target.value })} placeholder="Instant Approval&#10;No Prepayment Penalty" className="rounded-xl min-h-[80px]" />
                                </div>

                                <DialogFooter>
                                    <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl bg-primary text-white font-black shadow-lg shadow-blue-100">
                                        {submitting ? <Loader2 className="animate-spin mr-2" /> : 'Create Product'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                    <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-primary">
                            <FileText size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pending</p>
                            <p className="text-sm font-black text-gray-900">{applications.filter(a => a.status === 'submitted').length}</p>
                        </div>
                    </div>
                    <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                            <DollarSign size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Volume</p>
                            <p className="text-sm font-black text-gray-900">{formatCurrency(applications.reduce((acc, a) => acc + (a.status === 'approved' ? a.amount : 0), 0))}</p>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4">
                    <Loader2 className="animate-spin text-primary" size={48} />
                    <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Loading Facilities...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {activeTab === 'applications' ? (
                        applications.length === 0 ? (
                            <Card className="p-20 text-center bg-gray-50/50 border-2 border-dashed">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-4">
                                    <Clock className="text-gray-300" size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">No applications found</h3>
                                <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">All caught up! New loan applications will appear here for review.</p>
                            </Card>
                        ) : (
                            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                <th className="px-6 py-4">Application</th>
                                                <th className="px-6 py-4">Customer</th>
                                                <th className="px-6 py-4">Product</th>
                                                <th className="px-6 py-4">Amount</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {applications.map((app) => (
                                                <tr key={app.id} className="hover:bg-gray-50/50 transition-colors group">
                                                    <td className="px-6 py-5">
                                                        <p className="text-sm font-bold text-gray-900">#{app.id.slice(0, 8).toUpperCase()}</p>
                                                        <p className="text-[10px] text-gray-500">{formatDate(app.created_at)}</p>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <p className="text-sm font-medium text-gray-900">{app.user_email}</p>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <p className="text-xs font-bold text-gray-700">{app.product_name}</p>
                                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">{app.details.split(' - ')[1]}</p>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <p className="text-sm font-black text-primary">{formatCurrency(app.amount)}</p>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${app.status === 'approved' ? 'bg-green-50 text-green-700 border-green-100' :
                                                            app.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                                                                'bg-blue-50 text-blue-700 border-blue-100'
                                                            }`}>
                                                            {app.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        {app.status === 'submitted' && (
                                                            <div className="flex justify-end gap-2">
                                                                <Button size="sm" className="h-8 px-4 bg-primary text-white text-[10px] font-bold rounded-lg" onClick={() => (window.location.href = '/admin/approvals?tab=loans')}>
                                                                    Review
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {products.length === 0 ? (
                                <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No products created yet</p>
                                    <Button onClick={() => setShowCreateModal(true)} variant="link" className="mt-2 text-primary">Add your first loan product</Button>
                                </div>
                            ) : (
                                products.map((product) => (
                                    <Card key={product.id} className="p-6 rounded-2xl border-gray-100 shadow-sm hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-primary">
                                                <DollarSign size={24} />
                                            </div>
                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[8px] font-black uppercase tracking-widest">
                                                {product.type}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-gray-900 mb-1">{product.name}</h3>
                                        <p className="text-xs text-gray-500 line-clamp-2 mb-4">{product.description}</p>
                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                                            <div>
                                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Rate</p>
                                                <p className="text-sm font-black text-primary">{product.interest_rate}%</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Max Amount</p>
                                                <p className="text-sm font-medium text-gray-900">{formatCurrency(product.max_amount)}</p>
                                            </div>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
