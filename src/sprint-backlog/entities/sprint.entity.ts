import { Project } from 'src/projects/entities/project.entity';
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SprintBacklog } from './sprint.backlog.entity';
import { SprintLogging } from './sprint.logging.entity';
import { Issue } from 'src/issues/entities/issue.entity';

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

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  startedAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
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
