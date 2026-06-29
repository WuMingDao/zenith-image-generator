import type { Metadata } from 'next'
 
export const metadata: Metadata = {
  title: 'Zenith Image Generator',
  description: 'an multi-provider image ai generator with Next.js page.',
}
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  )
}