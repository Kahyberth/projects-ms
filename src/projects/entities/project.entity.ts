import { ProductBacklog } from '../../product-backlog/entities/product-backlog.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Members } from './members.entity';
import { Sprint } from '../../sprint-backlog/entities/sprint.entity';
import { SprintLogging } from '../../sprint-backlog/entities/sprint.logging.entity';
import { SprintBacklog } from '../../sprint-backlog/entities/sprint.backlog.entity';

@Entity({ name: 'projects' })
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ['completed', 'in-progress', 'on-hold'],
    default: 'in-progress',
  })
  status: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    enum: ['SCRUM', 'KANBAN'],
    default: 'SCRUM',
  })
  type: string;

  @Column({ type: 'varchar', length: 255 })
  createdBy: string;

  @Column({ type: 'bool', default: true })
  is_available: boolean;

  @Column({ type: 'varchar', length: 255 })
  team_id: string;

  @Column({ type: 'varchar', length: 50 })
  project_key: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  tags?: string[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  @OneToOne(() => ProductBacklog)
  @JoinColumn()
  backlog: ProductBacklog;

  @OneToMany(() => Members, (members) => members.project)
  members: Members[];

  @OneToMany(() => Sprint, (sprint) => sprint.project)
  sprint: Sprint[];

  @OneToMany(() => SprintBacklog, (sprintBacklog) => sprintBacklog.project)
  sprint_backlog: SprintBacklog[];

  @OneToMany(() => SprintLogging, (sprint_logging) => sprint_logging.project)
  logging: SprintLogging[];
}
