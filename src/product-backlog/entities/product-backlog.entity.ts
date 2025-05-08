import { Issue } from 'src/issues/entities/issue.entity';
import { Epic } from 'src/issues/entities/epic.entity';
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class ProductBacklog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp', nullable: true })
  created_date: string;

  @Column({ type: 'timestamp', nullable: true })
  updated_date: string;

  @ManyToOne(() => Issue, (issue) => issue.product_backlog)
  issue: Issue;

  @OneToMany(() => Epic, (epic) => epic.productBacklog)
  epics: Epic[];
}
