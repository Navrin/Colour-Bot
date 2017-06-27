import { Guild } from './../guild/model';
import { Entity, Column, PrimaryColumn, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { Colour } from '../colour/model';

import 'reflect-metadata';

@Entity()
export class User {
    @PrimaryColumn()
    id: string;

    @OneToOne(type => Colour)
    @JoinColumn()
    colour: Colour;

    @ManyToOne(type => Guild)
    guild: Guild;
}
