import { Metadata } from 'next'
import NotFoundContent from './not-found-content'

export const metadata: Metadata = {
  title: 'Página Não Encontrada | GladPros',
  description: 'A página que você está procurando não foi encontrada.',
}

export default function NotFound() {
  return <NotFoundContent />
}
