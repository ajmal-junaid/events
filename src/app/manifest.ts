import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Rental Manager',
        short_name: 'RentalMgr',
        description: 'Advanced rental management system',
        start_url: '/dashboard',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
            {
                src: '/icon',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    }
}
