import { ProductBacklog } from 'src/product-backlog/entities/product-backlog.entity';
import { SprintBacklog } from 'src/sprint-backlog/entities/sprint.backlog.entity';
import { Sprint } from 'src/sprint-backlog/entities/sprint.entity';
import { SprintLogging } from 'src/sprint-backlog/entities/sprint.logging.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Comments } from './comments.entity';
import { Epic } from './epic.entity';

@Entity({
  name: 'issues',
})
export class Issue {
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
    enum: ['review', 'to-do', 'in-progress', 'done', 'closed'],
    default: 'to-do',
  })
  status: string;

  @Column({
    type: 'enum',
    enum: ['bug', 'feature', 'task', 'refactor', 'user_story'],
    default: 'user_story',
  })
  type: string;

  @Column({ type: 'boolean', default: false })
  in_sprint: boolean;

  @Column({ type: 'varchar', length: 255 })
  code: string;

  @Column({ type: 'boolean', default: false })
  in_product_backlog: boolean;

  @Column({ type: 'varchar', length: 255 })
  acceptanceCriteria: string;

  @Column({ type: 'integer', nullable: true })
  story_points: number | null;

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

  @OneToMany(() => Comments, (comment) => comment.issue)
  comments: Comments[];

  @ManyToOne(() => ProductBacklog, (product) => product.issues, {
    nullable: true,
  })
  product_backlog: ProductBacklog | null;

  @ManyToOne(() => Epic, (epic) => epic.issue, { nullable: true })
  epic: Epic | null;

  @ManyToOne(() => SprintBacklog, (sprint_backlog) => sprint_backlog.issues, { nullable: true })
  sprint_backlog: SprintBacklog | null;

  @OneToMany(() => SprintLogging, (sprint_logging) => sprint_logging.issue)
  logging: SprintLogging[];

  @ManyToOne(() => Sprint, (sprint) => sprint.issues, { nullable: true })
  sprint: Sprint | null;
}
