import Image from 'next/image';
import { Plus } from 'lucide-react';
import styles from './ProductCard.module.css';

export default function ProductCard({ product, onAdd }) {
  return (
    <div className={`${styles.card} glass`} onClick={() => onAdd(product)}>
      <div className={styles.imageContainer}>
        {/* We use standard img for dynamic URLs with mock, or Next Image if configured */}
        <img src={product.image_url} alt={product.name} className={styles.image} loading="lazy" />
      </div>
      <div className={styles.content}>
        <span className={styles.category}>{product.category}</span>
        <h3 className={styles.title}>{product.name}</h3>
        <div className={styles.footer}>
          <span className={styles.price}>฿{product.price.toLocaleString()}</span>
          <button className={styles.addBtn}>
            <Plus size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
