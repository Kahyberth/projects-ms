import { Issue } from 'src/issues/entities/issue.entity';
import { Project } from 'src/projects/entities/project.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SprintBacklog } from './sprint.backlog.entity';
import { SprintLogging } from './sprint.logging.entity';

@Entity()
export class Sprint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  name: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  goal: string;

  @Column({ type: 'boolean', default: false })
  isFinished: boolean;

  @Column({ type: 'boolean', default: false })
  isStarted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  fnishedAt: Date;

  @ManyToOne(() => Project, (project) => project.sprint)
  project: Project;

  @OneToMany(() => SprintBacklog, (sprint_backlog) => sprint_backlog.sprint)
  sprint_backlog: SprintBacklog[];

  @OneToMany(() => SprintLogging, (sprint_logging) => sprint_logging.sprint)
  logging: SprintLogging[];

  @OneToMany(() => Issue, (issue) => issue.sprint)
  issues: Issue[];
}
