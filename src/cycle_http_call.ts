import axios from "axios";

const hideAllFields = async () => {
    for(let i=25;i<2000; i++)
  try {
    const response = await axios.get(`http://jiraft.moscow.alfaintra.net/secure/admin/EditFieldLayoutHide.jspa?atl_token=BXMG-7PLC-PE42-MECF_2d66f862da39e1c0af8fb64453bf53a60d3f7a63_lin&id=18560&hide=${i}`);
    console.log(`hideAllFields ${i} = ok`);
  } catch (error) {
    console.log(`hideAllFields ${i} = failed`);
  }
};

//hideAllFields();