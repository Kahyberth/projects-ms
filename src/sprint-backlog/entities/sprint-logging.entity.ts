import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Sprint } from './sprint.entity';
import { Issue } from 'src/issues/entities/issue.entity';

@Entity()
export class SprintLogging {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Sprint, sprint => sprint.logging)
  @JoinColumn({ name: 'sprint_id' })
  sprint: Sprint;

  @ManyToOne(() => Issue, issue => issue.logging)
  @JoinColumn({ name: 'issue_id' })
  issue: Issue;

  @Column({ type: 'varchar', length: 255 })
  status: string;

  @Column({ type: 'integer', nullable: true })
  storyPoints: number;

  @Column({ type: 'varchar', length: 255 })
  notes: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
} 