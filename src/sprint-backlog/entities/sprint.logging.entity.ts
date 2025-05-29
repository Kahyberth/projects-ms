import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Sprint } from './sprint.entity';
import { Project } from '../../projects/entities/project.entity';
import { Issue } from '../../issues/entities/issue.entity';

@Entity()
export class SprintLogging {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  user_id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  logging_date: Date;

  @ManyToOne(() => Sprint, (sprint) => sprint.logging)
  sprint: Sprint;

  @ManyToOne('Epic', 'logging')
  epic: any;

  @ManyToOne(() => Issue, (issue) => issue.logging)
  issue: Issue;

  @ManyToOne(() => Project, (project) => project.logging)
  project: Project;
}
