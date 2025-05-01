import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
    ManyToOne,
  } from 'typeorm';
import { Issue } from './issue.entity';
import { Epic } from './epic.entity';
  
  @Entity()
  export class Comments {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ type: 'varchar', length: 255 })
    user_id: string;
  
    @Column({ type: 'varchar', length: 255 })
    comment: string;
  
    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;
  
    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    updatedAt: Date;
  
    @ManyToOne(() => Issue, (issue) => issue.comments, { onDelete: 'CASCADE' })
    issue: Issue;

    @ManyToOne(() => Epic, (epic) => epic.comments)
    epic: Epic;
  }
  