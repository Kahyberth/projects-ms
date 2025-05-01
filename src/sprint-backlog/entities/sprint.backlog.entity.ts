import { Issue } from 'src/issues/entities/issue.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Sprint } from './sprint.entity';

@Entity()
export class SprintBacklog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  assigment_date: Date;

  @ManyToOne(() => Issue, (issue) => issue.sprint_backlog)
  issue: Issue;

  @ManyToOne(() => Sprint, (sprint) => sprint.sprint_backlog)
  sprint: Sprint;
}
