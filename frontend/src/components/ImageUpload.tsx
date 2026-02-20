import React, { useState } from 'react';
import { Input } from './ui/input';
import { Loader2, Upload, Link as LinkIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ value, onChange, label = "Image", className }) => {
    const [uploading, setUploading] = useState(false);
    const [mode, setMode] = useState<'url' | 'upload'>('url');

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            // Try to include Authorization header so the server route can auth even if cookie is missing
            let authHeader: Record<string, string> = {};
            try {
                const token = typeof window !== 'undefined'
                    ? (window.localStorage.getItem('access_token') || window.localStorage.getItem('admin_token') || '')
                    : '';
                if (token) {
                    authHeader = { Authorization: `Bearer ${token}` };
                }
            } catch {}
            const res = await fetch('/api/upload/avatar', {
                method: 'POST',
                body: formData,
                credentials: 'include',
                headers: {
                    ...authHeader,
                },
            });

            const data = await res.json();

            if (data.success) {
                onChange(data.data.url);
                toast.success('Image uploaded successfully');
            } else {
                if (res.status === 401) {
                    toast.error('Please log in to upload images');
                } else if (res.status === 501) {
                    toast.error('Uploads not configured on this server');
                } else {
                    toast.error(data.message || 'Upload failed');
                }
            }
        } catch (err) {
            toast.error('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={cn("space-y-3", className)}>
            <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</label>
                <div className="flex bg-gray-100 p-0.5 rounded-lg">
                    <button
                        type="button"
                        onClick={() => setMode('url')}
                        className={cn(
                            "px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all flex items-center gap-1",
                            mode === 'url' ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        <LinkIcon size={10} /> URL
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('upload')}
                        className={cn(
                            "px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all flex items-center gap-1",
                            mode === 'upload' ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        <Upload size={10} /> Upload
                    </button>
                </div>
            </div>

            <div className="relative group">
                {mode === 'url' ? (
                    <Input
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Paste image URL here..."
                        className="rounded-xl h-12 bg-gray-50/50 border-gray-100 focus:bg-white transition-all pr-10"
                    />
                ) : (
                    <div className="relative">
                        <input
                            type="file"
                            id="file-upload"
                            onChange={handleUpload}
                            disabled={uploading}
                            className="hidden"
                            accept="image/*"
                        />
                        <label
                            htmlFor="file-upload"
                            className={cn(
                                "flex items-center justify-center w-full h-12 rounded-xl border-2 border-dashed border-gray-100 bg-gray-50/50 cursor-pointer hover:bg-gray-100 transition-all",
                                uploading && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                                {uploading ? (
                                    <Loader2 size={16} className="animate-spin text-primary" />
                                ) : (
                                    <Upload size={16} />
                                )}
                                {uploading ? 'Uploading...' : 'Click to upload image'}
                            </div>
                        </label>
                    </div>
                )}

                {value && (
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {value && (
                <div className="mt-2 relative rounded-2xl overflow-hidden border border-gray-100 aspect-video bg-gray-50 group/preview shadow-sm">
                    <img
                        src={value}
                        alt="Preview"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover/preview:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-[10px] font-bold text-white uppercase tracking-widest">Image Preview</p>
                    </div>
                </div>
            )}
        </div>
    );
};
