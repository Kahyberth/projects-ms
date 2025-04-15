import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { Comments } from './comments.entity';
import { ProductBacklog } from 'src/product-backlog/entities/product-backlog.entity';
import { Epic } from './epic.entity';
import { SprintBacklog } from 'src/sprint-backlog/entities/sprint.backlog.entity';
import { SprintLogging } from 'src/sprint-backlog/entities/sprint.logging.entity';

@Entity({
  name: 'incidents',
})
export class Incident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  })
  priority: string;

  @Column({
    type: 'enum',
    enum: ['review', 'to-do', 'in-progress', 'resolved', 'closed'],
    default: 'to-do',
  })
  status: string;

  @Column({
    type: 'enum',
    enum: ['bug', 'feature', 'task', 'refactor'],
    default: 'feature',
  })
  type: string;

  @Column({ type: 'varchar', length: 255 })
  acceptanceCriteria: string;

  @Column({ type: 'integer', nullable: true })
  story_points: number;

  @Column({ type: 'varchar', length: 255 })
  createdBy: string;

  @Column({ type: 'varchar', length: 255 })
  assignedTo: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  finishedAt: Date | null;

  @OneToMany(() => Comments, (comment) => comment.incident)
  comments: Comments[];

  @OneToMany(() => ProductBacklog, (product) => product.incident)
  product_backlog: ProductBacklog[];

  @ManyToOne(() => Epic, (epic) => epic.incident)
  epic: Epic;

  @OneToMany(() => SprintBacklog, (sprint_backlog) => sprint_backlog.incident)
  sprint_backlog: SprintBacklog[];

  @OneToMany(()=> SprintLogging, (sprint_logging)=> sprint_logging.incident)
  logging: SprintLogging[];
}
