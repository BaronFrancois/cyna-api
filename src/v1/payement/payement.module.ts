import { Module } from "@nestjs/common";
import { PayementController } from "./payement.controller";
import { PayementService } from "./payement.service";

@Module({
    controllers: [PayementController],
    providers: [PayementService],
})
export class PayementModule {}