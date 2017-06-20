import { User } from './../user/model';
import { Colour } from './../colour/model';
import { Entity, PrimaryColumn, OneToMany, ManyToMany, Column } from 'typeorm';
import 'reflect-metadata';

@Entity()
export class Guild {
    @PrimaryColumn()
    id: number;

    @OneToMany(type => Colour, colour => colour.guild)
    colours: Colour[];

    @Column('string', { nullable: true })
    channel?: string;
};
