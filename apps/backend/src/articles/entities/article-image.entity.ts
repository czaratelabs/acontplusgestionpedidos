import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Article } from './article.entity';

@Entity('article_images')
export class ArticleImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'article_id', type: 'uuid' })
  articleId: string;

  @ManyToOne(() => Article, (a) => a.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_id' })
  article: Article;

  @Column({ type: 'text' })
  url: string;

  @Column({ name: 'is_main', type: 'boolean', default: false })
  isMain: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
