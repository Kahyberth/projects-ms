import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class ProductBacklog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp', nullable: true })
  created_date: string;

  @Column({ type: 'timestamp', nullable: true })
  updated_date: string;

  @OneToMany('Epic', 'productBacklog')
  epics: any[];

  @OneToMany('Issue', 'product_backlog')
  issues: any[];
}
