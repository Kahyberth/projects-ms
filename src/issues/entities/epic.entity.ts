import { Project } from 'src/projects/entities/project.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Issue } from './issue.entity';
import { Comments } from './comments.entity';
import { SprintLogging } from 'src/sprint-backlog/entities/sprint.logging.entity';

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
    enum: ['review', 'to-do', 'in-progress', 'resolved', 'closed'],
    default: 'to-do',
  })
  status: string;

  @ManyToOne(() => Project, (project) => project.epic)
  project: Project;

  @OneToMany(() => Issue, (issue) => issue.epic)
  issue: Issue[];

  @OneToMany(() => Comments, (comments) => comments.epic)
  comments: Comments[];

  @OneToMany(() => SprintLogging, (sprint_logging) => sprint_logging.epic)
  logging: SprintLogging[];
}
