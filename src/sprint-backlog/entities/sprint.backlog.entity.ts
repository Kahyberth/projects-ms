import { Project } from '../../projects/entities/project.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Sprint } from './sprint.entity';

@Entity()
export class SprintBacklog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  assigment_date: Date;

  @OneToMany('Issue', 'sprint_backlog')
  issues: any[];

  @ManyToOne(() => Sprint, (sprint) => sprint.sprint_backlog)
  sprint: Sprint;

  @ManyToOne(() => Project)
  project: Project;
}
