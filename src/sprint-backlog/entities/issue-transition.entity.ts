import { Issue } from 'src/issues/entities/issue.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Sprint } from './sprint.entity';

@Entity('issue_transitions')
export class IssueTransition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Issue, { onDelete: 'CASCADE' })
  issue: Issue;

  @ManyToOne(() => Sprint, { onDelete: 'SET NULL' })
  fromSprint: Sprint;

  @ManyToOne(() => Sprint, { onDelete: 'SET NULL' })
  toSprint: Sprint;

  @Column()
  issueId: string;

  @Column({ nullable: true })
  fromSprintId: string;

  @Column({ nullable: true })
  toSprintId: string;

  @Column()
  status: string;

  @Column({ type: 'int', nullable: true })
  storyPoints: number;

  @CreateDateColumn()
  transitionDate: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
