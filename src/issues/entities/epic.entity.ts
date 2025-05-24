import { ProductBacklog } from 'src/product-backlog/entities/product-backlog.entity';
import { SprintLogging } from 'src/sprint-backlog/entities/sprint.logging.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Issue } from './issue.entity';

@Entity()
export class Epic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'varchar', nullable: false })
  description: string;

  @Column({
    type: 'enum',
    enum: ['review', 'to-do', 'in-progress', 'done', 'closed'],
    default: 'to-do',
  })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt: Date;

  @ManyToOne(() => ProductBacklog, (productBacklog) => productBacklog.epics)
  productBacklog: ProductBacklog;

  @OneToMany(() => Issue, (issue) => issue.epic)
  issue: Issue[];

  @OneToMany(() => SprintLogging, (sprint_logging) => sprint_logging.epic)
  logging: SprintLogging[];
}
